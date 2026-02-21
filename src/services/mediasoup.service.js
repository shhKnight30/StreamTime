import * as mediasoup from 'mediasoup';
import os from 'os';
import logger from '../config/logger.js';

class MediasoupService {
    constructor() {
        this.workers = [];           // Mediasoup worker processes
        this.routers = new Map();    // Room routers (one per stream)
        this.transports = new Map(); // WebRTC transports per client
        this.producers = new Map();  // Media producers (streamers)
        this.consumers = new Map();  // Media consumers (viewers)
        this.peers = new Map();      // Connected peers info
    }

    /**
     * Initialize mediasoup workers
     * Creates one worker per CPU core for optimal performance
     */
    async initialize() {
        const numWorkers = os.cpus().length;

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: 'warn',
                logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
                rtcMinPort: 10000 + (i * 1000),  // Port ranges per worker
                rtcMaxPort: 19999 + (i * 1000)
            });

            worker.on('died', () => {
                logger.error(`Mediasoup worker ${i} died, exiting`);
                process.exit(1);
            });

            this.workers.push(worker);
            logger.info(`Mediasoup worker ${i} created with ports ${10000 + (i * 1000)}-${19999 + (i * 1000)}`);
        }
    }

    /**
     * Create a router for a stream room
     * @param {string} streamId - Stream identifier
     */
    async createRouter(streamId) {
        // Select worker using round-robin based on stream ID
        const workerIndex = this.hashString(streamId) % this.workers.length;
        const worker = this.workers[workerIndex];

        // Define supported media codecs
        const mediaCodecs = [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
                parameters: {
                    useinbandfec: 1,
                    usedtx: 1
                }
            },
            {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000
                }
            },
            {
                kind: 'video',
                mimeType: 'video/H264',
                clockRate: 90000,
                parameters: {
                    'packetization-mode': 1,
                    'profile-level-id': '42e01f',
                    'level-asymmetry-allowed': 1
                }
            }
        ];

        const router = await worker.createRouter({ mediaCodecs });
        this.routers.set(streamId, router);

        logger.info(`Router created for stream ${streamId} on worker ${workerIndex}`);
        return router;
    }

    /**
     * Get or create router for stream
     */
    async getOrCreateRouter(streamId) {
        let router = this.routers.get(streamId);
        if (!router) {
            router = await this.createRouter(streamId);
        }
        return router;
    }

    /**
     * Create WebRTC transport for a client
     * @param {string} streamId - Stream identifier
     * @param {string} peerId - Client peer identifier
     * @param {string} direction - 'send' or 'recv'
     */
    async createTransport(streamId, peerId, direction) {
        const router = await this.getOrCreateRouter(streamId);

        const transport = await router.createWebRtcTransport({
            listenIps: [
                { ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1' }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000, // 1Mbps
            maxIncomingBitrate: 5000000  // 5Mbps limit
        });

        // Store transport reference
        const transportId = transport.id;
        this.transports.set(transportId, {
            transport,
            streamId,
            peerId,
            direction,
            createdAt: Date.now()
        });

        // Handle transport events
        transport.on('dtlsstatechange', (dtlsState) => {
            logger.debug(`Transport ${transportId} DTLS state: ${dtlsState}`);
        });

        transport.on('close', () => {
            logger.info(`Transport ${transportId} closed`);
            this.transports.delete(transportId);
        });

        // Return transport data for client
        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: transport.sctpParameters
        };
    }

    /**
     * Create a producer for sending media
     * @param {string} transportId - Transport identifier
     * @param {string} kind - 'audio' or 'video'
     * @param {Object} rtpParameters - RTP parameters from client
     */
    async createProducer(transportId, kind, rtpParameters) {
        const transportData = this.transports.get(transportId);
        if (!transportData) {
            throw new Error('Transport not found');
        }

        const { transport, streamId, peerId } = transportData;

        const producer = await transport.produce({
            kind,
            rtpParameters,
            paused: false
        });

        // Store producer reference
        this.producers.set(producer.id, {
            producer,
            streamId,
            peerId,
            kind,
            createdAt: Date.now()
        });

        // Handle producer events
        producer.on('transportclose', () => {
            logger.info(`Producer ${producer.id} transport closed`);
            this.producers.delete(producer.id);
        });

        producer.on('score', (score) => {
            logger.debug(`Producer ${producer.id} score: ${JSON.stringify(score)}`);
        });

        logger.info(`Producer created: ${producer.id} for ${kind} in stream ${streamId}`);

        return {
            id: producer.id,
            kind: producer.kind,
            rtpParameters: producer.rtpParameters
        };
    }

    /**
     * Create a consumer for receiving media
     * @param {string} transportId - Transport identifier
     * @param {string} producerId - Producer to consume from
     * @param {Object} rtpCapabilities - Client RTP capabilities
     */
    async createConsumer(transportId, producerId, rtpCapabilities) {
        const transportData = this.transports.get(transportId);
        const producerData = this.producers.get(producerId);

        if (!transportData || !producerData) {
            throw new Error('Transport or producer not found');
        }

        const { transport, streamId } = transportData;
        const { producer } = producerData;

        // Check if router can consume this producer
        if (!transport.router.canConsume(producerId, rtpCapabilities)) {
            throw new Error('Cannot consume this producer with given RTP capabilities');
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false
        });

        // Store consumer reference
        this.consumers.set(consumer.id, {
            consumer,
            streamId,
            producerId,
            transportId,
            createdAt: Date.now()
        });

        // Handle consumer events
        consumer.on('transportclose', () => {
            logger.info(`Consumer ${consumer.id} transport closed`);
            this.consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
            logger.info(`Consumer ${consumer.id} producer closed`);
            this.consumers.delete(consumer.id);
        });

        logger.info(`Consumer created: ${consumer.id} consuming ${producerId}`);

        return {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type
        };
    }

    /**
     * Get router RTP capabilities for client
     */
    getRouterCapabilities(streamId) {
        const router = this.routers.get(streamId);
        return router ? router.rtpCapabilities : null;
    }

    /**
     * Get producers for a stream
     */
    getStreamProducers(streamId) {
        return Array.from(this.producers.values())
            .filter(p => p.streamId === streamId)
            .map(p => ({ id: p.producer.id, kind: p.kind }));
    }

    /**
     * Clean up resources for a stream
     */
    async cleanupStream(streamId) {
        // Close all transports for this stream
        const streamTransports = Array.from(this.transports.values())
            .filter(t => t.streamId === streamId);

        for (const transportData of streamTransports) {
            transportData.transport.close();
            this.transports.delete(transportData.transport.id);
        }

        // Close router
        const router = this.routers.get(streamId);
        if (router) {
            router.close();
            this.routers.delete(streamId);
        }

        logger.info(`Cleaned up resources for stream ${streamId}`);
    }

    /**
     * Hash function for worker selection
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(hash);
    }
}

export default new MediasoupService();

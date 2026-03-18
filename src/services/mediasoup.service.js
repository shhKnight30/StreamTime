import * as mediasoup from 'mediasoup'
import logger from '../config/logger.js'
import { LiveStream } from '../models/livestream.model.js'

class MediasoupService {
    constructor() {
        this.workers = []
        this.routers = new Map()
        this.transports = new Map()
        this.producers = new Map()
        this.consumers = new Map()
        this.peers = new Map()
    }

    // ─────────────────────────────────────────────
    // INITIALIZATION
    // ─────────────────────────────────────────────

    async initialize() {
        const numWorkers = Number(process.env.MEDIASOUP_WORKERS || 2)

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: 'warn',
                logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
                rtcMinPort: 10000 + (i * 1000),
                rtcMaxPort: 10999 + (i * 1000)
            })

            worker.on('died', () => {
                logger.error(`Mediasoup worker ${i} died, exiting`)
                process.exit(1)
            })

            this.workers.push(worker)
            logger.info(`Mediasoup worker ${i} created with ports ${10000 + (i * 1000)}-${10999 + (i * 1000)}`)
        }
    }

    // ─────────────────────────────────────────────
    // ROUTER
    // ─────────────────────────────────────────────

    async createRouter(streamId) {
        const workerIndex = this.hashString(streamId) % this.workers.length
        const worker = this.workers[workerIndex]

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
        ]

        const router = await worker.createRouter({ mediaCodecs })
        this.routers.set(streamId, router)

        logger.info(`Router created for stream ${streamId} on worker ${workerIndex}`)
        return router
    }

    async getOrCreateRouter(streamId) {
        let router = this.routers.get(streamId)
        if (!router) {
            router = await this.createRouter(streamId)
        }
        return router
    }

    // ─────────────────────────────────────────────
    // TRANSPORT
    // ─────────────────────────────────────────────

    async createTransport(streamId, peerId, direction) {
        const router = await this.getOrCreateRouter(streamId)
        const announcedIp = process.env.ANNOUNCED_IP || process.env.PUBLIC_IP || '127.0.0.1'

        const transport = await router.createWebRtcTransport({
            listenIps: [
                { ip: '0.0.0.0', announcedIp }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
            maxIncomingBitrate: 5000000
        })

        const transportId = transport.id
        this.transports.set(transportId, {
            transport,
            streamId,
            peerId,
            direction,
            createdAt: Date.now()
        })

        transport.on('dtlsstatechange', (dtlsState) => {
            logger.debug(`Transport ${transportId} DTLS state: ${dtlsState}`)
        })

        transport.on('close', () => {
            logger.info(`Transport ${transportId} closed`)
            this.transports.delete(transportId)
        })

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: transport.sctpParameters
        }
    }

    // ─────────────────────────────────────────────
    // PRODUCER
    // ─────────────────────────────────────────────

    async createProducer(transportId, kind, rtpParameters) {
        const transportData = this.transports.get(transportId)
        if (!transportData) {
            throw new Error('Transport not found')
        }

        const { transport, streamId, peerId } = transportData

        const producer = await transport.produce({
            kind,
            rtpParameters,
            paused: false
        })

        this.producers.set(producer.id, {
            producer,
            streamId,
            peerId,
            kind,
            createdAt: Date.now()
        })

        producer.on('transportclose', () => {
            logger.info(`Producer ${producer.id} transport closed`)
            this.producers.delete(producer.id)
        })

        producer.on('score', (score) => {
            logger.debug(`Producer ${producer.id} score: ${JSON.stringify(score)}`)
        })

        logger.info(`Producer created: ${producer.id} for ${kind} in stream ${streamId}`)

        return {
            id: producer.id,
            kind: producer.kind,
            rtpParameters: producer.rtpParameters
        }
    }

    // ─────────────────────────────────────────────
    // CONSUMER
    // ─────────────────────────────────────────────

    async createConsumer(transportId, producerId, rtpCapabilities) {
        const transportData = this.transports.get(transportId)
        const producerData = this.producers.get(producerId)

        if (!transportData || !producerData) {
            throw new Error('Transport or producer not found')
        }

        const { transport, streamId } = transportData
        const { producer } = producerData

        const router = this.routers.get(streamId)
        if (!router) throw new Error('Router not found for the stream')

        if (!router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error('Cannot consume this producer with given RTP capabilities')
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false
        })

        this.consumers.set(consumer.id, {
            consumer,
            streamId,
            producerId,
            transportId,
            createdAt: Date.now()
        })

        consumer.on('transportclose', () => {
            logger.info(`Consumer ${consumer.id} transport closed`)
            this.consumers.delete(consumer.id)
        })

        consumer.on('producerclose', () => {
            logger.info(`Consumer ${consumer.id} producer closed`)
            this.consumers.delete(consumer.id)
        })

        logger.info(`Consumer created: ${consumer.id} consuming ${producerId}`)

        return {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            type: consumer.type
        }
    }

    // ─────────────────────────────────────────────
    // DATABASE SYNC
    // ─────────────────────────────────────────────

    async startStreamInDB(streamId) {
        try {
            const mongoId = streamId.replace('stream_', '')
            await LiveStream.findByIdAndUpdate(mongoId, {
                isLive: true,
                startTime: new Date()
            })
            logger.info(`Stream ${streamId} marked LIVE in DB`)
        } catch (error) {
            logger.error('DB startStreamInDB error:', error.message)
        }
    }

    async stopStreamInDB(streamId) {
        try {
            const mongoId = streamId.replace('stream_', '')
            const stream = await LiveStream.findById(mongoId)
            if (!stream) return

            const endTime = new Date()
            const duration = stream.startTime
                ? Math.floor((endTime - stream.startTime) / 1000)
                : 0

            await LiveStream.findByIdAndUpdate(mongoId, {
                isLive: false,
                isWebRTCActive: false,
                endTime,
                duration
            })
            logger.info(`Stream ${streamId} marked ENDED in DB (duration: ${duration}s)`)
        } catch (error) {
            logger.error('DB stopStreamInDB error:', error.message)
        }
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    getRouterCapabilities(streamId) {
        const router = this.routers.get(streamId)
        return router ? router.rtpCapabilities : null
    }

    getStreamProducers(streamId) {
        return Array.from(this.producers.values())
            .filter(p => p.streamId === streamId)
            .map(p => ({ id: p.producer.id, kind: p.kind }))
    }

    async cleanupStream(streamId) {
        // Close consumers
        for (const [id, data] of this.consumers.entries()) {
            if (data.streamId === streamId) {
                data.consumer.close()
                this.consumers.delete(id)
            }
        }

        // Close producers
        for (const [id, data] of this.producers.entries()) {
            if (data.streamId === streamId) {
                data.producer.close()
                this.producers.delete(id)
            }
        }

        // Close transports
        for (const [id, data] of this.transports.entries()) {
            if (data.streamId === streamId) {
                data.transport.close()
                this.transports.delete(id)
            }
        }

        // Close router
        const router = this.routers.get(streamId)
        if (router) {
            router.close()
            this.routers.delete(streamId)
        }

        logger.info(`Cleaned up all mediasoup resources for stream ${streamId}`)
    }

    async createPlainTransport(streamId) {
        const router = this.routers.get(streamId);
        if (!router) throw new Error('Router not found');

        const transport = await router.createPlainTransport({
            listenIp: { ip: '127.0.0.1', announcedIp: null },
            rtcpMux: false,
            comedia: false
        });

        logger.info(`PlainTransport created for recording stream ${streamId}`);
        return transport;
    }

    /**
     * Start routing a producer's media to a specific local port for FFmpeg to capture
     */
    async startRecordingConsumer(streamId, plainTransport, producerId, remotePort) {
        const router = this.routers.get(streamId);
        
        // Connect the transport to the port FFmpeg is listening on
        await plainTransport.connect({
            ip: '127.0.0.1',
            port: remotePort,
            rtcpPort: remotePort + 1
        });

        // Create the consumer that will push media to FFmpeg
        const consumer = await plainTransport.consume({
            producerId,
            rtpCapabilities: router.rtpCapabilities, // consume without limitations
            paused: false
        });

        return consumer;
    }

    hashString(str) {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff
        }
        return Math.abs(hash)
    }
}

export default new MediasoupService()
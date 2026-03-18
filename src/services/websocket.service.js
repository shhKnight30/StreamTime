import { Server } from 'socket.io'
import logger from '../config/logger.js'
import mediasoupService from './mediasoup.service.js'

class WebSocketService {
    constructor() {
        this.io = null
        this.activeStreams = new Map()    // streamId → { streamerId, streamerSocketId, streamTitle, startTime, isActive }
        this.streamPeers = new Map()     // streamId → Map(userId → peerInfo)
        this.viewerConnections = new Map() // streamId → Set(socketId)
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        })

        this.io.on('connection', (socket) => {
            logger.logWebSocket('User Connected', { socketId: socket.id })

            // ─────────────────────────────────────────────
            // ROOM MANAGEMENT
            // ─────────────────────────────────────────────

            socket.on('join-stream', (streamId) => {
                socket.join(streamId)
                logger.logWebSocket('Stream Room Joined', { streamId, socketId: socket.id })
            })

            socket.on('leave-stream', (streamId) => {
                socket.leave(streamId)
                logger.logWebSocket('Stream Room Left', { streamId, socketId: socket.id })
            })

            // ─────────────────────────────────────────────
            // STREAMER — START STREAM
            // ─────────────────────────────────────────────

            socket.on('start-webrtc-stream', async (data) => {
                try {
                    const { streamId, userId, streamTitle } = data

                    // Clean up any stale mediasoup state for this stream
                    await mediasoupService.cleanupStream(streamId)

                    // Mark live in database
                    await mediasoupService.startStreamInDB(streamId)

                    // Track in memory
                    this.activeStreams.set(streamId, {
                        streamerId: userId,
                        streamerSocketId: socket.id,
                        streamTitle,
                        startTime: new Date(),
                        isActive: true
                    })
                    this.streamPeers.set(streamId, new Map())
                    this.viewerConnections.set(streamId, new Set())

                    socket.join(streamId)

                    logger.logWebSocket('WebRTC Stream Started', { streamId, userId })

                    socket.emit('stream-started', { streamId, status: 'ready' })
                } catch (error) {
                    logger.error('Failed to start stream', { error: error.message })
                    socket.emit('stream-error', { error: 'Failed to start stream' })
                }
            })

            // ─────────────────────────────────────────────
            // VIEWER — JOIN STREAM
            // ─────────────────────────────────────────────

            socket.on('join-webrtc-stream', async (data) => {
    const { streamId, userId } = data;

    try {
        // 1. Verify Stream Exists in memory
        if (!this.activeStreams.has(streamId)) {
            socket.emit('stream-error', { error: 'Stream is offline or does not exist', streamId });
            return;
        }

        // 2. Database Security Check
        const mongoId = streamId.replace('stream_', '');
        const stream = await LiveStream.findById(mongoId);

        if (!stream) {
            socket.emit('stream-error', { error: 'Stream record not found in database', streamId });
            return;
        }

        // 3. Access Control Logic
        if (stream.visibility === 'private') {
            // If it's private, ONLY the streamer should be able to join
            // (You can expand this later to check an 'allowedUsers' array)
            if (stream.streamer.toString() !== userId) {
                logger.warn(`Unauthorized access attempt to private stream ${streamId} by user ${userId}`);
                socket.emit('stream-error', { error: 'Unauthorized: This stream is private', streamId });
                return;
            }
        }

        // --- Original Join Logic Proceeds Here ---
        const streamInfo = this.activeStreams.get(streamId);

        if (!this.viewerConnections.has(streamId)) {
            this.viewerConnections.set(streamId, new Set());
        }
        
        this.viewerConnections.get(streamId).add(socket.id);
        const currentViewerCount = this.viewerConnections.get(streamId).size;

        const peerInfo = {
            userId,
            socketId: socket.id,
            joinedAt: new Date(),
            isConnected: false
        };
        
        this.streamPeers.get(streamId).set(userId, peerInfo);
        socket.join(streamId);

        logger.logWebSocket('Viewer Joined WebRTC Stream', {
            streamId,
            userId,
            socketId: socket.id,
            totalViewers: currentViewerCount
        });

        this.io.to(streamId).emit('viewer-count-update', { currentViewerCount });
        
        const streamerSocketId = streamInfo.streamerSocketId;
        this.io.to(streamerSocketId).emit('viewer-joined', {
            userId,
            socketId: socket.id,
            totalViewers: currentViewerCount
        });

        socket.emit('stream-joined', {
            streamId,
            streamTitle: streamInfo.streamTitle,
            totalViewers: currentViewerCount,
            status: 'ready'
        });

    } catch (error) {
        logger.error('Error joining stream', { error: error.message });
        socket.emit('stream-error', { error: 'Internal server error while joining stream' });
    }
            });

            // ─────────────────────────────────────────────
            // MEDIASOUP SIGNALING
            // ─────────────────────────────────────────────

            socket.on('get-router-capabilities', async (data) => {
                try {
                    const { streamId } = data
                    const router = await mediasoupService.getOrCreateRouter(streamId)

                    socket.emit('router-capabilities', {
                        capabilities: router.rtpCapabilities,
                        streamId
                    })

                    logger.logWebSocket('Router Capabilities Sent', { streamId, socketId: socket.id })
                } catch (error) {
                    logger.error('Failed to get router capabilities', { error: error.message })
                    socket.emit('router-error', { error: error.message, streamId: data.streamId })
                }
            })

            socket.on('create-transport', async (data) => {
                try {
                    const { streamId, direction } = data
                    const peerId = socket.id

                    const transportOptions = await mediasoupService.createTransport(streamId, peerId, direction)

                    socket.emit('transport-created', { transport: transportOptions, direction })

                    logger.logWebSocket('Transport Created', {
                        streamId,
                        direction,
                        transportId: transportOptions.id,
                        socketId: socket.id
                    })
                } catch (error) {
                    logger.error('Failed to create transport', { error: error.message })
                    socket.emit('transport-error', { error: 'Failed to create transport' })
                }
            })

            socket.on('connect-transport', async (data) => {
                try {
                    const { transportId, dtlsParameters } = data
                    const transportData = mediasoupService.transports.get(transportId)

                    if (!transportData) throw new Error('Transport not found')

                    await transportData.transport.connect({ dtlsParameters })

                    socket.emit('transport-connected', { transportId })

                    logger.logWebSocket('Transport Connected (DTLS)', { transportId, socketId: socket.id })
                } catch (error) {
                    logger.error('Failed to connect transport', { error: error.message })
                    socket.emit('transport-error', { error: error.message, transportId: data.transportId })
                }
            })

            socket.on('produce', async (data) => {
                try {
                    const { transportId, kind, rtpParameters } = data
                    const producerData = await mediasoupService.createProducer(transportId, kind, rtpParameters)

                    socket.emit('producer-created', { producer: producerData, transportId })
                    const streamId = mediasoupService.transports.get(transportId).streamId;
                    const producers = mediasoupService.getStreamProducers(streamId);
                    if (producers.some(p => p.kind === 'video')) {
                        // Small delay to ensure both audio/video producers are initialized
                        setTimeout(() => {
                            recordingService.startRecording(streamId);
                        }, 2000);
                    }
                    logger.logWebSocket('Producer Created', {
                        producerId: producerData.id,
                        kind,
                        transportId,
                        socketId: socket.id
                    })
                } catch (error) {
                    logger.error('Failed to create producer', { error: error.message })
                    socket.emit('producer-error', { error: error.message, transportId: data.transportId })
                }
            })

            socket.on('consume', async (data) => {
                try {
                    const { transportId, producerId, rtpCapabilities } = data
                    const consumerData = await mediasoupService.createConsumer(transportId, producerId, rtpCapabilities)

                    socket.emit('consumer-created', { consumer: consumerData, transportId, producerId })

                    logger.logWebSocket('Consumer Created', {
                        consumerId: consumerData.id,
                        producerId,
                        transportId,
                        socketId: socket.id
                    })
                } catch (error) {
                    logger.error('Failed to create consumer', { error: error.message })
                    socket.emit('consumer-error', {
                        error: error.message,
                        transportId: data.transportId,
                        producerId: data.producerId
                    })
                }
            })

            socket.on('get-producers', (data) => {
                try {
                    const { streamId } = data
                    const producers = mediasoupService.getStreamProducers(streamId)
                    socket.emit('producers-list', { producers, streamId })
                } catch (error) {
                    logger.error('Failed to get producers', { error: error.message })
                    socket.emit('producers-error', { error: error.message })
                }
            })

            // ─────────────────────────────────────────────
            // STREAMER — END STREAM
            // ─────────────────────────────────────────────

            socket.on('stream-ended', async (data) => {
                const { streamId } = data

                if (!this.activeStreams.has(streamId)) return
                recordingService.stopRecording(streamId);
                const streamInfo = this.activeStreams.get(streamId)
                const duration = Date.now() - new Date(streamInfo.startTime).getTime()

                logger.logWebSocket('Stream Ended by Streamer', {
                    streamId,
                    duration,
                    totalViewers: this.viewerConnections.get(streamId)?.size || 0
                })

                // Notify all viewers
                this.io.to(streamId).emit('stream-ended', {
                    streamId,
                    message: 'Stream has ended',
                    duration
                })

                // Update database
                await mediasoupService.stopStreamInDB(streamId)

                // Clean up memory
                this.activeStreams.delete(streamId)
                this.streamPeers.delete(streamId)
                this.viewerConnections.delete(streamId)

                // Clean up mediasoup resources
                await mediasoupService.cleanupStream(streamId)

                socket.leave(streamId)
            })

            // ─────────────────────────────────────────────
            // CHAT
            // ─────────────────────────────────────────────

            socket.on('send-chat-message', (data) => {
                const { streamId, message, user } = data

                this.io.to(streamId).emit('new-chat-message', {
                    id: Date.now(),
                    text: message,
                    username: user.username,
                    avatar: user.avatar,
                    timestamp: new Date()
                })
            })

            // ─────────────────────────────────────────────
            // DISCONNECT
            // ─────────────────────────────────────────────

            socket.on('disconnect', async () => {
                logger.logWebSocket('User Disconnected', { socketId: socket.id })

                // Check if disconnected user was the streamer
                for (const [streamId, streamInfo] of this.activeStreams.entries()) {
                    if (streamInfo.streamerSocketId === socket.id) {
                        logger.logWebSocket('Streamer Disconnected — Ending Stream', { streamId })

                        // Notify all viewers
                        this.io.to(streamId).emit('stream-ended', {
                            streamId,
                            message: 'Streamer disconnected',
                            reason: 'streamer-disconnect'
                        })

                        // Update database
                        await mediasoupService.stopStreamInDB(streamId)

                        // Clean up memory
                        this.activeStreams.delete(streamId)
                        this.streamPeers.delete(streamId)
                        this.viewerConnections.delete(streamId)

                        // Clean up mediasoup resources
                        await mediasoupService.cleanupStream(streamId)

                        return // Only one stream per streamer socket
                    }
                }

                // Check if disconnected user was a viewer
                for (const [streamId, viewers] of this.viewerConnections.entries()) {
                    if (viewers.has(socket.id)) {
                        viewers.delete(socket.id)

                        // Remove from peer tracking
                        const peers = this.streamPeers.get(streamId)
                        if (peers) {
                            for (const [userId, peerInfo] of peers.entries()) {
                                if (peerInfo.socketId === socket.id) {
                                    peers.delete(userId)
                                    break
                                }
                            }
                        }

                        const viewerCount = viewers.size

                        // Broadcast updated count
                        this.io.to(streamId).emit('viewer-count-update', { viewerCount })

                        logger.logWebSocket('Viewer Disconnected', {
                            streamId,
                            socketId: socket.id,
                            viewerCount
                        })

                        break // A socket can only be in one stream
                    }
                }
            })
        })
    }

    // ─────────────────────────────────────────────
    // PUBLIC HELPERS (used by HTTP controllers)
    // ─────────────────────────────────────────────

    broadcastToStream(streamId, event, data) {
        if (this.io) {
            this.io.to(streamId).emit(event, data)
        }
    }

    getStreamInfo(streamId) {
        return this.activeStreams.get(streamId) || null
    }

    getViewerCount(streamId) {
        return this.viewerConnections.get(streamId)?.size || 0
    }

    getActiveStreams() {
        const streams = []
        for (const [streamId, streamInfo] of this.activeStreams.entries()) {
            streams.push({
                streamId,
                streamTitle: streamInfo.streamTitle,
                startTime: streamInfo.startTime,
                viewerCount: this.getViewerCount(streamId),
                isActive: streamInfo.isActive
            })
        }
        return streams
    }
}

export default new WebSocketService()
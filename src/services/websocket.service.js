import { Server } from "socket.io"
import logger from '../config/logger.js'
import mediasoupService from './mediasoup.service.js'
import { LiveStream } from '../models/livestream.model.js'
import recordingService from './recording.service.js'

class WebSocketService {
    constructor() {
        this.io = null
        this.activeStreams = new Map()
        this.streamPeers = new Map()
        this.viewerConnections = new Map()
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            }
        })

        this.io.on('connection', (socket) => {
            logger.logWebSocket('User Connected', { socketId: socket.id })

            socket.on('start-webrtc-stream', async (data) => {
                const { streamId, userId, streamTitle, dbStreamId } = data

                await mediasoupService.cleanupStream(streamId)
                await mediasoupService.startStreamInDB(streamId)
                
                this.activeStreams.set(streamId, {
                    streamerId: userId,
                    streamerSocketId: socket.id,
                    streamTitle,
                    dbStreamId,
                    startTime: new Date(),
                    isActive: true
                })

                this.streamPeers.set(streamId, new Map())
                this.viewerConnections.set(streamId, new Set())

                socket.join(streamId)

                logger.logWebSocket('WebRTC Stream Started', {
                    streamId,
                    userId
                })

                socket.emit('stream-started', {
                    streamId,
                    status: 'ready'
                })
            })

            socket.on('join-webrtc-stream', async (data) => {
                const { streamId, userId } = data

                try {
                    if (!this.activeStreams.has(streamId)) {
                        socket.emit('stream-error', { error: 'Stream is offline or does not exist', streamId })
                        return
                    }

                    const streamInfo = this.activeStreams.get(streamId)
                    const mongoId = streamInfo?.dbStreamId

                    const stream = await LiveStream.findById(mongoId)

                    if (!stream) {
                        socket.emit('stream-error', { error: 'Stream record not found in database', streamId })
                        return
                    }

                    if (stream.visibility === 'private') {
                        if (stream.streamer.toString() !== userId) {
                            logger.warn(`Unauthorized access attempt to private stream ${streamId} by user ${userId}`)
                            socket.emit('stream-error', { error: 'Unauthorized: This stream is private', streamId })
                            return
                        }
                    }

                    if (!this.viewerConnections.has(streamId)) {
                        this.viewerConnections.set(streamId, new Set())
                    }
                    
                    this.viewerConnections.get(streamId).add(socket.id)
                    const currentViewerCount = this.viewerConnections.get(streamId).size

                    const peerInfo = {
                        userId,
                        socketId: socket.id,
                        joinedAt: new Date(),
                        isConnected: false
                    }
                    
                    this.streamPeers.get(streamId).set(userId, peerInfo)
                    socket.join(streamId)

                    logger.logWebSocket('Viewer Joined WebRTC Stream', {
                        streamId,
                        userId,
                        socketId: socket.id,
                        totalViewers: currentViewerCount
                    })

                    this.io.to(streamId).emit('viewer-count-update', { currentViewerCount })
                    
                    const streamerSocketId = streamInfo.streamerSocketId
                    this.io.to(streamerSocketId).emit('viewer-joined', {
                        userId,
                        socketId: socket.id,
                        totalViewers: currentViewerCount
                    })

                    socket.emit('stream-joined', {
                        streamId,
                        streamTitle: streamInfo.streamTitle,
                        totalViewers: currentViewerCount,
                        status: 'ready'
                    })

                } catch (error) {
                    logger.error('Error joining stream', { error: error.message })
                    socket.emit('stream-error', { error: 'Internal server error while joining stream' })
                }
            })

            socket.on('produce', async (data) => {
                try {
                    const { transportId, kind, rtpParameters } = data
                    const producerData = await mediasoupService.createProducer(transportId, kind, rtpParameters)

                    socket.emit('producer-created', {
                        producer: producerData,
                        transportId
                    })

                    const streamId = mediasoupService.transports.get(transportId).streamId
                    const producers = mediasoupService.getStreamProducers(streamId)
                    
                    if (producers.some(p => p.kind === 'video')) {
                        setTimeout(() => {
                            recordingService.startRecording(streamId)
                        }, 2000)
                    }

                } catch (error) {
                    logger.error('Failed to create producer', { error: error.message, socketId: socket.id })
                    socket.emit('producer-error', {
                        error: error.message,
                        transportId: data.transportId
                    })
                }
            })

            socket.on('stream-ended', async (data) => {
                const { streamId } = data

                if (!this.activeStreams.has(streamId)) {
                    return
                }

                recordingService.stopRecording(streamId)

                const streamInfo = this.activeStreams.get(streamId)
                const duration = Date.now() - streamInfo.startTime

                logger.logWebSocket('WebRTC Stream Ended', {
                    streamId,
                    duration,
                    totalViewers: this.viewerConnections.get(streamId)?.size || 0
                })

                this.io.to(streamId).emit('stream-ended', {
                    streamId,
                    message: 'Stream has ended',
                    duration
                })

                try {
                    await mediasoupService.stopStreamInDB(streamId)
                } catch (err) {
                    logger.error('Failed to stop stream in DB', { error: err.message })
                }

                this.activeStreams.delete(streamId)
                this.streamPeers.delete(streamId)
                this.viewerConnections.delete(streamId)
                
                await mediasoupService.cleanupStream(streamId)

                socket.leave(streamId)
            })

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

            socket.on('create-transport', async (data) => {
                try {
                    const { streamId, direction } = data
                    const peerId = socket.id

                    const transportOptions = await mediasoupService.createTransport(
                        streamId, 
                        peerId, 
                        direction
                    )

                    socket.emit('transport-created', { transport: transportOptions, direction })
                    
                    logger.logWebSocket('Transport Created', { 
                        streamId, 
                        direction, 
                        transportId: transportOptions.id 
                    })
                } catch (error) {
                    logger.error('Failed to create transport', { error: error.message })
                    socket.emit('error', { message: 'Failed to create transport' })
                }
            })

            socket.on('get-producers', (data) => {
                const { streamId } = data
                const producers = mediasoupService.getStreamProducers(streamId)
                socket.emit('producers-list', { producers })
            })

            socket.on('join-stream', (streamId) => {
                socket.join(streamId)
                logger.logWebSocket('Stream Joined', { streamId, socketId: socket.id })
            })

            socket.on('leave-stream', (streamId) => {
                socket.leave(streamId)
                logger.logWebSocket('Stream Left', { streamId, socketId: socket.id })
            })

            socket.on('connect-transport', async (data) => {
                try {
                    const { transportId, dtlsParameters } = data
                    const transportData = mediasoupService.transports.get(transportId)
                    
                    if (!transportData) throw new Error("Transport not found")

                    await transportData.transport.connect({ dtlsParameters })
                    
                    socket.emit('transport-connected', { transportId })
                    logger.logWebSocket('Transport Connected (DTLS)', { transportId })
                } catch (error) {
                    logger.error('Failed to connect transport', { error: error.message })
                }
            })

            socket.on('consume', async (data) => {
                try {
                    const { transportId, producerId, rtpCapabilities } = data
                    const consumerData = await mediasoupService.createConsumer(transportId, producerId, rtpCapabilities)

                    socket.emit('consumer-created', {
                        consumer: consumerData,
                        transportId,
                        producerId
                    })

                    logger.logWebSocket('Consumer Created', {
                        consumerId: consumerData.id,
                        producerId,
                        transportId,
                        socketId: socket.id
                    })
                } catch (error) {
                    logger.error('Failed to create consumer', { error: error.message, socketId: socket.id })
                    socket.emit('consumer-error', {
                        error: error.message,
                        transportId: data.transportId,
                        producerId: data.producerId
                    })
                }
            })

            socket.on('get-router-capabilities', async (data) => {
                try {
                    const { streamId } = data
                    
                    const router = await mediasoupService.getOrCreateRouter(streamId)
                    const capabilities = router.rtpCapabilities

                    socket.emit('router-capabilities', {
                        capabilities,
                        streamId
                    })
                    
                    logger.logWebSocket('Sent Router Capabilities to Viewer', { streamId, socketId: socket.id })
                } catch (error) {
                    logger.error('Failed to get router capabilities', { error: error.message, socketId: socket.id })
                    socket.emit('router-error', {
                        error: error.message,
                        streamId: data.streamId
                    })
                }
            })

            socket.on('disconnect', async () => {
                logger.logWebSocket('User Disconnected', { socketId: socket.id })

                for (const [streamId, streamInfo] of this.activeStreams.entries()) {
                    if (streamInfo.streamerSocketId === socket.id) {
                        
                        try {
                            await mediasoupService.stopStreamInDB(streamId)
                        } catch (err) {
                            logger.error('Failed to stop stream in DB on disconnect', { error: err.message })
                        }

                        this.io.to(streamId).emit('stream-ended', {
                            streamId,
                            message: 'Streamer disconnected',
                            reason: 'streamer-disconnect'
                        })

                        this.activeStreams.delete(streamId)
                        this.streamPeers.delete(streamId)
                        this.viewerConnections.delete(streamId)
                        
                        await mediasoupService.cleanupStream(streamId)
                        
                        logger.logWebSocket('Streamer Disconnected - Stream Ended & DB Updated', { streamId })
                        return
                    }
                }

                for (const [streamId, viewers] of this.viewerConnections.entries()) {
                    if (viewers.has(socket.id)) {
                        viewers.delete(socket.id)

                        const peers = this.streamPeers.get(streamId)
                        if (peers) {
                            for (const [userId, peerInfo] of peers.entries()) {
                                if (peerInfo.socketId === socket.id) {
                                    peers.delete(userId)
                                    break
                                }
                            }
                        }

                        const currentCount = viewers.size
                        this.io.to(streamId).emit('viewer-count-update', { count: currentCount })

                        logger.logWebSocket('Viewer Disconnected', {
                            streamId,
                            socketId: socket.id,
                            remainingViewers: currentCount
                        })
                        break
                    }
                }
            })
        })
    }

    broadcastToStream(streamId, event, data) {
        this.io.to(streamId).emit(event, data)
    }

    getStreamInfo(streamId) {
        return this.activeStreams.get(streamId)
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
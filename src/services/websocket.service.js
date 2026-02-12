import { Server } from "socket.io";
import logger from '../config/logger.js';

class WebSocketService {
    constructor() {
        this.io = null
        this.activeStreams = new Map()
        this.streamPeers = new Map()
        this.viewerConnections = new Map()
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: { origin: "*" }
        })

        this.io.on('connection', (socket) => {
            logger.logWebSocket('User Connected', { socketId: socket.id });

            // Existing events
            socket.on('join-stream', (streamId) => {
                socket.join(streamId)
                logger.logWebSocket('Stream Joined', { streamId, socketId: socket.id });
            })

            socket.on('leave-stream', (streamId) => {
                socket.leave(streamId)
                logger.logWebSocket('Stream Left', { streamId, socketId: socket.id });
            })

            // Streamer starts WebRTC stream
            socket.on('start-webrtc-stream', (data) => {
                const { streamId, userId, streamTitle } = data

                // Store streamer info
                this.activeStreams.set(streamId, {
                    streamerId: userId,
                    streamerSocketId: socket.id,
                    streamTitle,
                    startTime: new Date(),
                    isActive: true
                })

                // Initialize peer connections map for this stream
                this.streamPeers.set(streamId, new Map())
                this.viewerConnections.set(streamId, new Set())

                // Join streamer to their own room
                socket.join(streamId)

                logger.logWebSocket('WebRTC Stream Started', {
                    streamId,
                    userId,
                    streamTitle,
                    socketId: socket.id
                })

                // Notify streamer that stream is ready
                socket.emit('stream-started', {
                    streamId,
                    status: 'ready',
                    message: 'Stream is ready for viewers'
                })
            })

            // Viewer joins WebRTC stream
            socket.on('join-webrtc-stream', (data) => {
                const { streamId, userId } = data

                if (!this.activeStreams.has(streamId)) {
                    socket.emit('stream-error', {
                        error: 'Stream not found',
                        streamId
                    })
                    return
                }

                const streamInfo = this.activeStreams.get(streamId)

                // Add viewer to connections
                this.viewerConnections.get(streamId).add(socket.id)

                // Store viewer info
                const peerInfo = {
                    userId,
                    socketId: socket.id,
                    joinedAt: new Date(),
                    isConnected: false
                }
                this.streamPeers.get(streamId).set(userId, peerInfo)

                // Join viewer to stream room
                socket.join(streamId)

                logger.logWebSocket('Viewer Joined WebRTC Stream', {
                    streamId,
                    userId,
                    socketId: socket.id,
                    totalViewers: this.viewerConnections.get(streamId).size
                })

                // Notify streamer about new viewer
                const streamerSocketId = streamInfo.streamerSocketId
                this.io.to(streamerSocketId).emit('viewer-joined', {
                    userId,
                    socketId: socket.id,
                    totalViewers: this.viewerConnections.get(streamId).size
                })

                // Notify viewer they've joined
                socket.emit('stream-joined', {
                    streamId,
                    streamTitle: streamInfo.streamTitle,
                    totalViewers: this.viewerConnections.get(streamId).size,
                    status: 'waiting-for-offer'
                })
            })

            // Streamer sends WebRTC offer to viewer
            socket.on('webrtc-offer', (data) => {
                const { streamId, targetUserId, offer } = data

                if (!this.streamPeers.has(streamId)) {
                    socket.emit('stream-error', {
                        error: 'Stream not found',
                        streamId
                    })
                    return
                }

                const targetPeer = this.streamPeers.get(streamId).get(targetUserId)
                if (!targetPeer) {
                    socket.emit('stream-error', {
                        error: 'Viewer not found',
                        targetUserId
                    })
                    return
                }

                logger.logWebSocket('WebRTC Offer Sent', {
                    streamId,
                    from: socket.id,
                    to: targetPeer.socketId,
                    targetUserId
                })

                // Send offer to specific viewer
                this.io.to(targetPeer.socketId).emit('webrtc-offer', {
                    streamId,
                    fromUserId: this.activeStreams.get(streamId).streamerId,
                    offer
                })
            })

            // Viewer sends WebRTC answer to streamer
            socket.on('webrtc-answer', (data) => {
                const { streamId, answer } = data

                if (!this.activeStreams.has(streamId)) {
                    socket.emit('stream-error', {
                        error: 'Stream not found',
                        streamId
                    })
                    return
                }

                const streamInfo = this.activeStreams.get(streamId)

                logger.logWebSocket('WebRTC Answer Sent', {
                    streamId,
                    from: socket.id,
                    to: streamInfo.streamerSocketId
                })

                // Send answer to streamer
                this.io.to(streamInfo.streamerSocketId).emit('webrtc-answer', {
                    streamId,
                    fromSocketId: socket.id,
                    answer
                })
            })

            // ICE candidate exchange
            socket.on('ice-candidate', (data) => {
                const { streamId, targetUserId, candidate } = data

                let targetSocketId

                if (targetUserId) {
                    // Streamer sending to viewer or viewer sending to streamer
                    const streamInfo = this.activeStreams.get(streamId)
                    if (streamInfo) {
                        targetSocketId = targetUserId === streamInfo.streamerId
                            ? streamInfo.streamerSocketId
                            : this.streamPeers.get(streamId)?.get(targetUserId)?.socketId
                    }
                } else {
                    // If no target, broadcast to all in stream (except sender)
                    socket.to(streamId).emit('ice-candidate', {
                        streamId,
                        fromSocketId: socket.id,
                        candidate
                    })
                    return
                }

                if (targetSocketId) {
                    logger.logWebSocket('ICE Candidate Sent', {
                        streamId,
                        from: socket.id,
                        to: targetSocketId
                    })

                    this.io.to(targetSocketId).emit('ice-candidate', {
                        streamId,
                        fromSocketId: socket.id,
                        candidate
                    })
                }
            })

            // Streamer ends stream
            socket.on('stream-ended', (data) => {
                const { streamId } = data

                if (!this.activeStreams.has(streamId)) {
                    return
                }

                const streamInfo = this.activeStreams.get(streamId)
                const duration = Date.now() - streamInfo.startTime

                logger.logWebSocket('WebRTC Stream Ended', {
                    streamId,
                    duration,
                    totalViewers: this.viewerConnections.get(streamId)?.size || 0
                })

                // Notify all viewers that stream ended
                this.io.to(streamId).emit('stream-ended', {
                    streamId,
                    message: 'Stream has ended',
                    duration
                })

                // Clean up stream data
                this.activeStreams.delete(streamId)
                this.streamPeers.delete(streamId)
                this.viewerConnections.delete(streamId)

                // Leave the room
                socket.leave(streamId)
            })

            // Handle disconnection
            socket.on('disconnect', () => {
                logger.logWebSocket('User Disconnected', { socketId: socket.id });

                // Check if disconnected user was a streamer
                for (const [streamId, streamInfo] of this.activeStreams.entries()) {
                    if (streamInfo.streamerSocketId === socket.id) {
                        // Streamer disconnected, end the stream
                        this.io.to(streamId).emit('stream-ended', {
                            streamId,
                            message: 'Streamer disconnected',
                            reason: 'streamer-disconnect'
                        })

                        // Clean up
                        this.activeStreams.delete(streamId)
                        this.streamPeers.delete(streamId)
                        this.viewerConnections.delete(streamId)

                        logger.logWebSocket('Streamer Disconnected - Stream Ended', { streamId });
                        break
                    }
                }

                // Check if disconnected user was a viewer
                for (const [streamId, viewers] of this.viewerConnections.entries()) {
                    if (viewers.has(socket.id)) {
                        viewers.delete(socket.id)

                        // Find and remove from peers
                        const peers = this.streamPeers.get(streamId)
                        if (peers) {
                            for (const [userId, peerInfo] of peers.entries()) {
                                if (peerInfo.socketId === socket.id) {
                                    peers.delete(userId)
                                    break
                                }
                            }
                        }

                        // Notify streamer about viewer leaving
                        const streamInfo = this.activeStreams.get(streamId)
                        if (streamInfo) {
                            this.io.to(streamInfo.streamerSocketId).emit('viewer-left', {
                                socketId: socket.id,
                                totalViewers: viewers.size
                            })
                        }

                        logger.logWebSocket('Viewer Disconnected from Stream', {
                            streamId,
                            socketId: socket.id,
                            remainingViewers: viewers.size
                        })
                        break
                    }
                }
            })
        }) // End of connection event
    }

    broadcastToStream(streamId, event, data) {
        this.io.to(streamId).emit(event, data)
    }

    // Get stream info
    getStreamInfo(streamId) {
        return this.activeStreams.get(streamId)
    }

    // Get viewer count for stream
    getViewerCount(streamId) {
        return this.viewerConnections.get(streamId)?.size || 0
    }

    // Get all active streams
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
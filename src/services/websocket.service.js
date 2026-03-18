import { Server } from "socket.io";
import logger from '../config/logger.js';
import mediasoupService from './mediasoup.service.js';

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
            origin: "http://localhost:3000", // Replace with your frontend URL
            methods: ["GET", "POST"],
            credentials: true
        }
        })

        this.io.on('connection', (socket) => {
            logger.logWebSocket('User Connected', { socketId: socket.id });
            socket.on('create-transport', async (data) => {
    try {
        const { streamId, direction } = data;
        const peerId = socket.id; // Using socket ID as peer identifier

        const transportOptions = await mediasoupService.createTransport(
            streamId, 
            peerId, 
            direction
        );

        socket.emit('transport-created', { transport: transportOptions,direction });
        
        logger.logWebSocket('Transport Created', { 
            streamId, 
            direction, 
            transportId: transportOptions.id 
        });
    } catch (error) {
        logger.error('Failed to create transport', { error: error.message });
        socket.emit('error', { message: 'Failed to create transport' });
    }
});
socket.on('get-producers', (data) => {
    const { streamId } = data;
    const producers = mediasoupService.getStreamProducers(streamId);
    socket.emit('producers-list', { producers });
});
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
            socket.on('start-webrtc-stream', async (data) => { // Added async
    const { streamId, userId, streamTitle } = data;

    // 1. UPDATE DATABASE STATUS
    await mediasoupService.cleanupStream(streamId);
    await mediasoupService.startStreamInDB(streamId);

    // Store streamer info in memory (Existing logic)
    this.activeStreams.set(streamId, {
        streamerId: userId,
        streamerSocketId: socket.id,
        streamTitle,
        startTime: new Date(),
        isActive: true
    });

    // Initialize tracking (Existing logic)
    this.streamPeers.set(streamId, new Map());
    this.viewerConnections.set(streamId, new Set());

    socket.join(streamId);

    logger.logWebSocket('WebRTC Stream Started & DB Updated', {
        streamId,
        userId
    });

    socket.emit('stream-started', {
        streamId,
        status: 'ready'
    });
});

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
                if (!this.viewerConnections.has(streamId)) {
                    this.viewerConnections.set(streamId, new Set());
                }
                this.viewerConnections.get(streamId).add(socket.id)
                const currentViewerCount = this.viewerConnections.get(streamId).size;
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
                    totalViewers: currentViewerCount
                })

                // Notify streamer about new viewer
                this.io.to(streamId).emit('viewer-count-update', { currentViewerCount });
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

            // ===== MEDIASOUP SFU EVENTS =====

            // Create WebRTC transport for client
            socket.on('connect-transport', async (data) => {
                try {
                    const { transportId, dtlsParameters } = data;
                    const transportData = mediasoupService.transports.get(transportId);
                    
                    if (!transportData) throw new Error("Transport not found");

                    await transportData.transport.connect({ dtlsParameters });
                    
                    socket.emit('transport-connected', { transportId });
                    logger.logWebSocket('Transport Connected (DTLS)', { transportId });
                } catch (error) {
                    logger.error('Failed to connect transport', { error: error.message });
                }
            });

            // Client wants to produce (send) media
            socket.on('produce', async (data) => {
                try {
                    const { transportId, kind, rtpParameters } = data;
                    const producerData = await mediasoupService.createProducer(transportId, kind, rtpParameters);

                    socket.emit('producer-created', {
                        producer: producerData,
                        transportId
                    });

                    logger.logWebSocket('Producer Created', {
                        producerId: producerData.id,
                        kind,
                        transportId,
                        socketId: socket.id
                    });
                } catch (error) {
                    logger.error('Failed to create producer', { error: error.message, socketId: socket.id });
                    socket.emit('producer-error', {
                        error: error.message,
                        transportId: data.transportId
                    });
                }
            });

            // Client wants to consume (receive) media
            socket.on('consume', async (data) => {
                try {
                    const { transportId, producerId, rtpCapabilities } = data;
                    const consumerData = await mediasoupService.createConsumer(transportId, producerId, rtpCapabilities);

                    socket.emit('consumer-created', {
                        consumer: consumerData,
                        transportId,
                        producerId
                    });

                    logger.logWebSocket('Consumer Created', {
                        consumerId: consumerData.id,
                        producerId,
                        transportId,
                        socketId: socket.id
                    });
                } catch (error) {
                    logger.error('Failed to create consumer', { error: error.message, socketId: socket.id });
                    socket.emit('consumer-error', {
                        error: error.message,
                        transportId: data.transportId,
                        producerId: data.producerId
                    });
                }
            });

            // Get router capabilities for client
            // src/services/websocket.service.js

            socket.on('get-router-capabilities', async (data) => {
                try {
                    const { streamId } = data;
                    
                    // FIX: Ensure the router is created/retrieved before getting capabilities
                    const router = await mediasoupService.getOrCreateRouter(streamId);
                    const capabilities = router.rtpCapabilities;

                    socket.emit('router-capabilities', {
                        capabilities,
                        streamId
                    });
                    
                    logger.logWebSocket('Sent Router Capabilities to Viewer', { streamId, socketId: socket.id });
                } catch (error) {
                    logger.error('Failed to get router capabilities', { error: error.message, socketId: socket.id });
                    socket.emit('router-error', {
                        error: error.message,
                        streamId: data.streamId
                    });
                }
            });

            // Get available producers for a stream
            socket.on('get-producers', (data) => {
                try {
                    const { streamId } = data;
                    const producers = mediasoupService.getStreamProducers(streamId);

                    socket.emit('producers-list', {
                        producers,
                        streamId
                    });
                } catch (error) {
                    logger.error('Failed to get producers', { error: error.message, socketId: socket.id });
                    socket.emit('producers-error', {
                        error: error.message,
                        streamId: data.streamId
                    });
                }
            });

            

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
            socket.on('send-chat-message', (data) => {
                const { streamId, message, user } = data;
                
                // Broadcast message to everyone in the stream room
                this.io.to(streamId).emit('new-chat-message', {
                    id: Date.now(),
                    text: message,
                    username: user.username,
                    avatar: user.avatar,
                    timestamp: new Date()
                });
            });
            // Handle disconnection
            socket.on('disconnect', async () => {
    logger.logWebSocket('User Disconnected', { socketId: socket.id });

    // 1. Check if the disconnected user was a STREAMER
    for (const [streamId, streamInfo] of this.activeStreams.entries()) {
        if (streamInfo.streamerSocketId === socket.id) {
            
            // ✅ FIX: Now streamId is defined within this scope
            try {
                await mediasoupService.stopStreamInDB(streamId);
            } catch (err) {
                logger.error('Failed to stop stream in DB on disconnect', { error: err.message });
            }

            // Notify all viewers in the room that the stream has ended
            this.io.to(streamId).emit('stream-ended', {
                streamId,
                message: 'Streamer disconnected',
                reason: 'streamer-disconnect'
            });

            // Clean up all server-side memory for this stream
            this.activeStreams.delete(streamId);
            this.streamPeers.delete(streamId);
            this.viewerConnections.delete(streamId);
            
            // Mediasoup-specific cleanup (closing routers/transports)
            mediasoupService.cleanupStream(streamId);
            
            logger.logWebSocket('Streamer Disconnected - Stream Ended & DB Updated', { streamId });
            return; // Exit once the streamer is found and handled
        }
    }

    // 2. Check if the disconnected user was a VIEWER
    for (const [streamId, viewers] of this.viewerConnections.entries()) {
        if (viewers.has(socket.id)) {
            viewers.delete(socket.id);

            // Remove viewer from the peers tracking map
            const peers = this.streamPeers.get(streamId);
            if (peers) {
                for (const [userId, peerInfo] of peers.entries()) {
                    if (peerInfo.socketId === socket.id) {
                        peers.delete(userId);
                        break;
                    }
                }
            }

            // Update the streamer and remaining viewers with the new count
            const currentCount = viewers.size;
            this.io.to(streamId).emit('viewer-count-update', { count: currentCount });

            logger.logWebSocket('Viewer Disconnected', {
                streamId,
                socketId: socket.id,
                remainingViewers: currentCount
            });
            break;
        }
    }
});
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
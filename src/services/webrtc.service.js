import logger from '../config/logger.js';

class WebRTCService {
    constructor() {
        this.peerConnections = new Map() // streamId -> Map of userId -> RTCPeerConnection
        this.mediaStreams = new Map()    // streamId -> MediaStream
        this.streamConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    }

    /**
     * Create a new peer connection for streamer
     * @param {string} streamId - Stream identifier
     * @param {string} userId - User identifier
     * @param {Object} socket - Socket.io socket instance
     * @returns {RTCPeerConnection} - WebRTC peer connection
     */
    createStreamerPeer(streamId, userId, socket) {
        try {
            const peerConnection = new RTCPeerConnection(this.streamConfig)
            
            // Store peer connection
            if (!this.peerConnections.has(streamId)) {
                this.peerConnections.set(streamId, new Map())
            }
            this.peerConnections.get(streamId).set(userId, peerConnection)

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {
                        streamId,
                        candidate: event.candidate
                    })
                    logger.logWebSocket('ICE Candidate Generated', { 
                        streamId, 
                        userId,
                        candidateType: event.candidate.type
                    })
                }
            }

            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                logger.logWebSocket('Peer Connection State Changed', {
                    streamId,
                    userId,
                    state: peerConnection.connectionState
                })

                if (peerConnection.connectionState === 'failed') {
                    logger.error('Peer connection failed', { streamId, userId })
                    this.removePeer(streamId, userId)
                }
            }

            logger.logWebSocket('Streamer Peer Connection Created', { streamId, userId })
            return peerConnection

        } catch (error) {
            logger.error('Failed to create streamer peer connection', { 
                streamId, 
                userId, 
                error: error.message 
            })
            throw error
        }
    }

    /**
     * Create a new peer connection for viewer
     * @param {string} streamId - Stream identifier
     * @param {string} userId - User identifier
     * @param {Object} socket - Socket.io socket instance
     * @returns {RTCPeerConnection} - WebRTC peer connection
     */
    createViewerPeer(streamId, userId, socket) {
        try {
            const peerConnection = new RTCPeerConnection(this.streamConfig)
            
            // Store peer connection
            if (!this.peerConnections.has(streamId)) {
                this.peerConnections.set(streamId, new Map())
            }
            this.peerConnections.get(streamId).set(userId, peerConnection)

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {
                        streamId,
                        candidate: event.candidate
                    })
                    logger.logWebSocket('Viewer ICE Candidate Generated', { 
                        streamId, 
                        userId,
                        candidateType: event.candidate.type
                    })
                }
            }

            // Handle incoming tracks (video/audio)
            peerConnection.ontrack = (event) => {
                logger.logWebSocket('Incoming Track Received', {
                    streamId,
                    userId,
                    trackKind: event.track.kind,
                    trackCount: event.streams.length
                })

                // Notify viewer that they've received the stream
                socket.emit('stream-received', {
                    streamId,
                    stream: event.streams[0],
                    track: event.track
                })
            }

            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                logger.logWebSocket('Viewer Peer Connection State Changed', {
                    streamId,
                    userId,
                    state: peerConnection.connectionState
                })

                if (peerConnection.connectionState === 'connected') {
                    logger.logWebSocket('Viewer Successfully Connected', { streamId, userId })
                } else if (peerConnection.connectionState === 'failed') {
                    logger.error('Viewer peer connection failed', { streamId, userId })
                    this.removePeer(streamId, userId)
                }
            }

            logger.logWebSocket('Viewer Peer Connection Created', { streamId, userId })
            return peerConnection

        } catch (error) {
            logger.error('Failed to create viewer peer connection', { 
                streamId, 
                userId, 
                error: error.message 
            })
            throw error
        }
    }

    /**
     * Create and send offer from streamer to viewer
     * @param {string} streamId - Stream identifier
     * @param {string} streamerUserId - Streamer user ID
     * @param {string} targetUserId - Target viewer user ID
     * @param {Object} socket - Socket.io socket instance
     */
    async createOffer(streamId, streamerUserId, targetUserId, socket) {
        try {
            const peerConnection = this.getPeerConnection(streamId, streamerUserId)
            if (!peerConnection) {
                throw new Error('Streamer peer connection not found')
            }

            // Create offer
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            })

            // Set local description
            await peerConnection.setLocalDescription(offer)

            logger.logWebSocket('WebRTC Offer Created', {
                streamId,
                streamerUserId,
                targetUserId,
                offerType: offer.type
            })

            return offer

        } catch (error) {
            logger.error('Failed to create WebRTC offer', {
                streamId,
                streamerUserId,
                targetUserId,
                error: error.message
            })
            throw error
        }
    }

    /**
     * Handle WebRTC answer from viewer
     * @param {string} streamId - Stream identifier
     * @param {string} streamerUserId - Streamer user ID
     * @param {Object} answer - WebRTC answer object
     */
    async handleAnswer(streamId, streamerUserId, answer) {
        try {
            const peerConnection = this.getPeerConnection(streamId, streamerUserId)
            if (!peerConnection) {
                throw new Error('Streamer peer connection not found')
            }

            // Set remote description
            await peerConnection.setRemoteDescription(answer)

            logger.logWebSocket('WebRTC Answer Handled', {
                streamId,
                streamerUserId,
                answerType: answer.type
            })

        } catch (error) {
            logger.error('Failed to handle WebRTC answer', {
                streamId,
                streamerUserId,
                error: error.message
            })
            throw error
        }
    }

    /**
     * Handle WebRTC offer from streamer (viewer side)
     * @param {string} streamId - Stream identifier
     * @param {string} viewerUserId - Viewer user ID
     * @param {Object} offer - WebRTC offer object
     * @param {Object} socket - Socket.io socket instance
     */
    async handleOffer(streamId, viewerUserId, offer, socket) {
        try {
            const peerConnection = this.getPeerConnection(streamId, viewerUserId)
            if (!peerConnection) {
                throw new Error('Viewer peer connection not found')
            }

            // Set remote description
            await peerConnection.setRemoteDescription(offer)

            // Create answer
            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            })

            // Set local description
            await peerConnection.setLocalDescription(answer)

            logger.logWebSocket('WebRTC Offer Handled & Answer Created', {
                streamId,
                viewerUserId,
                offerType: offer.type,
                answerType: answer.type
            })

            return answer

        } catch (error) {
            logger.error('Failed to handle WebRTC offer', {
                streamId,
                viewerUserId,
                error: error.message
            })
            throw error
        }
    }

    /**
     * Add ICE candidate to peer connection
     * @param {string} streamId - Stream identifier
     * @param {string} userId - User identifier
     * @param {Object} candidate - ICE candidate object
     */
    async addIceCandidate(streamId, userId, candidate) {
        try {
            const peerConnection = this.getPeerConnection(streamId, userId)
            if (!peerConnection) {
                throw new Error('Peer connection not found')
            }

            await peerConnection.addIceCandidate(candidate)

            logger.logWebSocket('ICE Candidate Added', {
                streamId,
                userId,
                candidateType: candidate.type
            })

        } catch (error) {
            logger.error('Failed to add ICE candidate', {
                streamId,
                userId,
                error: error.message
            })
            // Don't throw here as ICE candidates can fail occasionally
        }
    }

    /**
     * Add media stream to peer connection (streamer side)
     * @param {string} streamId - Stream identifier
     * @param {string} userId - User identifier
     * @param {MediaStream} stream - Media stream to add
     */
    async addMediaStream(streamId, userId, stream) {
        try {
            const peerConnection = this.getPeerConnection(streamId, userId)
            if (!peerConnection) {
                throw new Error('Peer connection not found')
            }

            // Add all tracks from the stream
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream)
            })

            // Store the media stream
            this.mediaStreams.set(streamId, stream)

            logger.logWebSocket('Media Stream Added', {
                streamId,
                userId,
                trackCount: stream.getTracks().length,
                audioTracks: stream.getAudioTracks().length,
                videoTracks: stream.getVideoTracks().length
            })

        } catch (error) {
            logger.error('Failed to add media stream', {
                streamId,
                userId,
                error: error.message
            })
            throw error
        }
    }

    /**
     * Get peer connection for user in stream
     * @param {string} streamId - Stream identifier
     * @param {string} userId - User identifier
     * @returns {RTCPeerConnection|null} - Peer connection or null
     */
    getPeerConnection(streamId, userId) {
        return this.peerConnections.get(streamId)?.get(userId) || null
    }

    /**
     * Remove peer connection
     * @param {string} streamId - Stream identifier
     * @param {string} userId - User identifier
     */
    removePeer(streamId, userId) {
        try {
            const peerConnection = this.getPeerConnection(streamId, userId)
            if (peerConnection) {
                // Close the peer connection
                peerConnection.close()
                
                // Remove from storage
                this.peerConnections.get(streamId)?.delete(userId)
                
                logger.logWebSocket('Peer Connection Removed', {
                    streamId,
                    userId
                })
            }

            // Clean up empty stream maps
            if (this.peerConnections.get(streamId)?.size === 0) {
                this.peerConnections.delete(streamId)
                this.mediaStreams.delete(streamId)
            }

        } catch (error) {
            logger.error('Failed to remove peer connection', {
                streamId,
                userId,
                error: error.message
            })
        }
    }

    /**
     * Clean up all connections for a stream
     * @param {string} streamId - Stream identifier
     */
    cleanupStream(streamId) {
        try {
            const streamPeers = this.peerConnections.get(streamId)
            if (streamPeers) {
                // Close all peer connections
                for (const [userId, peerConnection] of streamPeers.entries()) {
                    peerConnection.close()
                    logger.logWebSocket('Peer Connection Closed During Cleanup', {
                        streamId,
                        userId
                    })
                }
            }

            // Remove all data for this stream
            this.peerConnections.delete(streamId)
            this.mediaStreams.delete(streamId)

            logger.logWebSocket('Stream Cleanup Completed', { streamId })

        } catch (error) {
            logger.error('Failed to cleanup stream', {
                streamId,
                error: error.message
            })
        }
    }

    /**
     * Get stream statistics
     * @param {string} streamId - Stream identifier
     * @returns {Object} - Stream statistics
     */
    getStreamStats(streamId) {
        const peerCount = this.peerConnections.get(streamId)?.size || 0
        const mediaStream = this.mediaStreams.get(streamId)
        
        return {
            streamId,
            activeConnections: peerCount,
            hasMediaStream: !!mediaStream,
            audioTracks: mediaStream?.getAudioTracks().length || 0,
            videoTracks: mediaStream?.getVideoTracks().length || 0
        }
    }

    /**
     * Get all active streams statistics
     * @returns {Array} - Array of stream statistics
     */
    getAllStreamStats() {
        const stats = []
        for (const streamId of this.peerConnections.keys()) {
            stats.push(this.getStreamStats(streamId))
        }
        return stats
    }
}

export default new WebRTCService()

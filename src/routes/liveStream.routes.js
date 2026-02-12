import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createLiveStream,getLiveStreamById,getLiveStreams,updateLiveStream,deleteLiveStream,startLiveStream,stopLiveStream,startWebRTCStream,stopWebRTCStream,getWebRTCStreamInfo,getActiveWebRTCStreams,getWebRTCStats } from "../controllers/liveStream.controller.js";

const router = Router()

/**
 * @swagger
 * tags:
 *   - name: LiveStreams
 *     description: Live stream endpoints
 */

/**
 * @swagger
 * /api/v1/live-stream/create:
 *   post:
 *     summary: Create a new live stream
 *     description: Create a live stream session with title, description, and streaming settings
 *     tags: [LiveStreams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Stream title - must be unique and engaging
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Live Coding Session - Building a React App"
 *               description:
 *                 type: string
 *                 description: Stream description - tell viewers what to expect
 *                 maxLength: 500
 *                 example: "Join me as I build a React application from scratch and share tips along the way!"
 *               category:
 *                 type: string
 *                 enum: [gaming, music, education, entertainment, sports, talk, other]
 *                 default: other
 *                 description: Stream category for better discovery
 *                 example: "education"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags for better searchability
 *                 example: ["coding", "react", "webdev", "tutorial"]
 *               thumbnail:
 *                 type: string
 *                 description: Stream thumbnail URL - S3 hosted image
 *                 example: "https://bucket.s3.region.amazonaws.com/stream-thumbnail.jpg"
 *               chatEnabled:
 *                 type: boolean
 *                 default: true
 *                 description: Enable live chat during stream
 *                 example: true
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 default: public
 *                 description: Stream visibility - public everyone can see, private only followers, unlisted anyone with link
 *                 example: "public"
 *     responses:
 *       201:
 *         description: Live stream created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Live stream created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LiveStream'
 *       400:
 *         description: Bad request - validation errors or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - user already has an active live stream
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/create').post(verifyJWT,createLiveStream)

/**
 * @swagger
 * /api/v1/live-stream:
 *   get:
 *     summary: Get live streams
 *     description: Retrieve paginated list of live streams with filtering options
 *     tags: [LiveStreams]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of streams per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [gaming, music, education, entertainment, sports, talk, other]
 *         description: Filter by stream category
 *         example: "gaming"
 *       - in: query
 *         name: isLive
 *         schema:
 *           type: boolean
 *         description: Filter by live status - true for live streams only, false for all streams
 *         example: true
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [viewers, createdAt, startTime, likes]
 *           default: "viewers"
 *         description: Sort streams by specified field
 *         example: "viewers"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: "desc"
 *         description: Sort order - ascending or descending
 *         example: "desc"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search streams by title or description
 *         example: "coding"
 *     responses:
 *       200:
 *         description: Live streams retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Live streams fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     streams:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LiveStream'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     totalLive:
 *                       type: integer
 *                       description: Number of currently live streams
 *                       example: 15
 *       400:
 *         description: Bad request - invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/').get(getLiveStreams)

/**
 * @swagger
 * /api/v1/live-stream/{streamId}:
 *   get:
 *     summary: Get live stream by ID
 *     description: Retrieve a specific live stream with full details and viewer information
 *     tags: [LiveStreams]
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Live stream retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Live stream fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LiveStream'
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId').get(getLiveStreamById)

/**
 * @swagger
 * /api/v1/live-stream/{streamId}:
 *   patch:
 *     summary: Update live stream
 *     description: Update live stream details - only stream owner can update
 *     tags: [LiveStreams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated stream title
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Updated Live Stream Title"
 *               description:
 *                 type: string
 *                 description: Updated stream description
 *                 maxLength: 500
 *                 example: "Updated description for the live stream"
 *               category:
 *                 type: string
 *                 enum: [gaming, music, education, entertainment, sports, talk, other]
 *                 description: Updated stream category
 *                 example: "education"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated tags for better searchability
 *                 example: ["coding", "react", "webdev"]
 *               thumbnail:
 *                 type: string
 *                 description: Updated stream thumbnail URL - S3 hosted image
 *                 example: "https://bucket.s3.region.amazonaws.com/new-thumbnail.jpg"
 *               chatEnabled:
 *                 type: boolean
 *                 description: Enable/disable live chat during stream
 *                 example: true
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 description: Updated stream visibility
 *                 example: "public"
 *     responses:
 *       200:
 *         description: Live stream updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Live stream updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LiveStream'
 *       400:
 *         description: Bad request - validation errors or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only stream owner can update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId').patch(verifyJWT,updateLiveStream)

/**
 * @swagger
 * /api/v1/live-stream/{streamId}:
 *   delete:
 *     summary: Delete live stream
 *     description: Delete a live stream permanently - only stream owner can delete
 *     tags: [LiveStreams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Live stream deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Live stream deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedStream:
 *                       $ref: '#/components/schemas/LiveStream'
 *                     streamDuration:
 *                       type: integer
 *                       description: Stream duration in seconds
 *                       example: 3600
 *                     peakViewers:
 *                       type: integer
 *                       description: Peak viewer count during stream
 *                       example: 150
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only stream owner can delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - cannot delete active live stream
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId').delete(verifyJWT,deleteLiveStream)

/**
 * @swagger
 * /api/v1/live-stream/{streamId}/start:
 *   post:
 *     summary: Start live stream
 *     description: Start a live stream session - only stream owner can start
 *     tags: [LiveStreams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Live stream started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Live stream started successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     stream:
 *                       $ref: '#/components/schemas/LiveStream'
 *                     streamKey:
 *                       type: string
 *                       description: RTMP stream key for broadcasting
 *                       example: "sk_64f1a2b3c4d5e6f7g8h9i0j1"
 *                     ingestUrl:
 *                       type: string
 *                       description: RTMP ingest URL for streaming software
 *                       example: "rtmp://live.streamtime.com/live"
 *                     playbackUrl:
 *                       type: string
 *                       description: HLS playback URL for viewers
 *                       example: "https://cdn.streamtime.com/hls/64f1a2b3c4d5e6f7g8h9i0j1.m3u8"
 *       400:
 *         description: Bad request - stream already live or invalid state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only stream owner can start
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - stream is already live
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId/start').post(verifyJWT,startLiveStream)

/**
 * @swagger
 * /api/v1/live-stream/{streamId}/stop:
 *   post:
 *     summary: Stop live stream
 *     description: Stop a live stream session and generate final statistics - only stream owner can stop
 *     tags: [LiveStreams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Live stream stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Live stream stopped successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     stream:
 *                       $ref: '#/components/schemas/LiveStream'
 *                     finalStats:
 *                       type: object
 *                       properties:
 *                         totalDuration:
 *                           type: integer
 *                           description: Total stream duration in seconds
 *                           example: 3600
 *                         peakViewers:
 *                           type: integer
 *                           description: Peak concurrent viewers
 *                           example: 150
 *                         totalViews:
 *                           type: integer
 *                           description: Total unique viewers
 *                           example: 500
 *                         totalLikes:
 *                           type: integer
 *                           description: Total likes received
 *                           example: 75
 *                         totalComments:
 *                           type: integer
 *                           description: Total comments made
 *                           example: 120
 *                     recordingUrl:
 *                       type: string
 *                       description: URL to stream recording if available
 *                       example: "https://cdn.streamtime.com/recordings/64f1a2b3c4d5e6f7g8h9i0j1.mp4"
 *       400:
 *         description: Bad request - stream is not live or invalid state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only stream owner can stop
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - stream is not currently live
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId/stop').post(verifyJWT,stopLiveStream)

// ===== WEBRTC SPECIFIC ROUTES =====

/**
 * @swagger
 * /api/v1/live-stream/{streamId}/start-webrtc:
 *   post:
 *     summary: Start WebRTC streaming
 *     description: Initialize WebRTC streaming for a live stream - only stream owner can start
 *     tags: [LiveStreams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: WebRTC stream started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "WebRTC stream started successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     streamId:
 *                       type: string
 *                       example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                     roomId:
 *                       type: string
 *                       example: "room_abc123def456"
 *                     title:
 *                       type: string
 *                       example: "My Live Stream"
 *                     isWebRTCActive:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "WebRTC stream initialized. Ready to start broadcasting."
 *       400:
 *         description: Bad request - WebRTC stream already active or invalid state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only stream owner can start WebRTC
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId/start-webrtc').post(verifyJWT, startWebRTCStream)

/**
 * @swagger
 * /api/v1/live-stream/{streamId}/stop-webrtc:
 *   post:
 *     summary: Stop WebRTC streaming
 *     description: Stop WebRTC streaming and cleanup connections - only stream owner can stop
 *     tags: [LiveStreams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: WebRTC stream stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "WebRTC stream stopped successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     streamId:
 *                       type: string
 *                       example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                     duration:
 *                       type: integer
 *                       description: Stream duration in seconds
 *                       example: 3600
 *                     message:
 *                       type: string
 *                       example: "WebRTC stream stopped successfully"
 *       400:
 *         description: Bad request - WebRTC stream is not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only stream owner can stop WebRTC
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId/stop-webrtc').post(verifyJWT, stopWebRTCStream)

/**
 * @swagger
 * /api/v1/live-stream/{streamId}/webrtc-info:
 *   get:
 *     summary: Get WebRTC stream information
 *     description: Get detailed WebRTC stream information with connection statistics
 *     tags: [LiveStreams]
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Live stream ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: WebRTC stream information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "WebRTC stream information retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     stream:
 *                       $ref: '#/components/schemas/LiveStream'
 *                     webRTC:
 *                       type: object
 *                       properties:
 *                         streamId:
 *                           type: string
 *                           example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                         activeConnections:
 *                           type: integer
 *                           example: 25
 *                         hasMediaStream:
 *                           type: boolean
 *                           example: true
 *                         audioTracks:
 *                           type: integer
 *                           example: 1
 *                         videoTracks:
 *                           type: integer
 *                           example: 1
 *                         currentViewers:
 *                           type: integer
 *                           example: 25
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *       404:
 *         description: Live stream not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:streamId/webrtc-info').get(getWebRTCStreamInfo)

/**
 * @swagger
 * /api/v1/live-stream/webrtc/active:
 *   get:
 *     summary: Get active WebRTC streams
 *     description: Get list of all active WebRTC streams with statistics
 *     tags: [LiveStreams]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of streams per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [gaming, music, education, entertainment, sports, talk, other]
 *         description: Filter by stream category
 *         example: "gaming"
 *     responses:
 *       200:
 *         description: Active WebRTC streams retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Active WebRTC streams retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     streams:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/LiveStream'
 *                           - type: object
 *                             properties:
 *                               webRTC:
 *                                 type: object
 *                                 properties:
 *                                   streamId:
 *                                     type: string
 *                                     example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                                   activeConnections:
 *                                     type: integer
 *                                     example: 25
 *                                   hasMediaStream:
 *                                     type: boolean
 *                                     example: true
 *                                   currentViewers:
 *                                     type: integer
 *                                     example: 25
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.route('/webrtc/active').get(getActiveWebRTCStreams)

/**
 * @swagger
 * /api/v1/live-stream/webrtc/stats:
 *   get:
 *     summary: Get WebRTC statistics
 *     description: Get comprehensive WebRTC connection statistics for all active streams
 *     tags: [LiveStreams]
 *     responses:
 *       200:
 *         description: WebRTC statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "WebRTC statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalActiveStreams:
 *                       type: integer
 *                       description: Total number of active WebRTC streams
 *                       example: 15
 *                     totalWebRTCConnections:
 *                       type: integer
 *                       description: Total WebRTC connections across all streams
 *                       example: 500
 *                     streams:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           streamId:
 *                             type: string
 *                             example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                           activeConnections:
 *                             type: integer
 *                             example: 25
 *                           hasMediaStream:
 *                             type: boolean
 *                             example: true
 *                           audioTracks:
 *                             type: integer
 *                             example: 1
 *                           videoTracks:
 *                             type: integer
 *                             example: 1
 *                     activeStreams:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           streamId:
 *                             type: string
 *                             example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *                           streamTitle:
 *                             type: string
 *                             example: "My Live Stream"
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-02-12T20:00:00.000Z"
 *                           viewerCount:
 *                             type: integer
 *                             example: 25
 *                           isActive:
 *                             type: boolean
 *                             example: true
 */
router.route('/webrtc/stats').get(getWebRTCStats)

export default router
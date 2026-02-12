import { addVideoToPlaylist, createPlaylist, deletePlaylist, getAllPlaylists, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express";

const router = Router()

/**
 * @swagger
 * tags:
 *   - name: Playlists
 *     description: Playlist management
 */

/**
 * @swagger
 * /api/v1/playlists/create:
 *   post:
 *     summary: Create a new playlist
 *     description: Create a playlist for organizing videos with optional thumbnail
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Playlist name - must be unique for the user
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "My Favorite Videos"
 *               description:
 *                 type: string
 *                 description: Playlist description - optional but recommended
 *                 maxLength: 500
 *                 example: "A collection of my all-time favorite videos"
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 default: public
 *                 description: Playlist visibility - public everyone can see, private only owner, unlisted anyone with link
 *                 example: "public"
 *               category:
 *                 type: string
 *                 enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *                 description: Playlist category for better organization
 *                 example: "entertainment"
 *               thumbnail:
 *                 type: string
 *                 description: Playlist thumbnail URL - S3 hosted image
 *                 example: "https://bucket.s3.region.amazonaws.com/thumbnail.jpg"
 *     responses:
 *       201:
 *         description: Playlist created successfully
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
 *                   example: "Playlist created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Playlist'
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
 *         description: Conflict - playlist name already exists for this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/create').post(verifyJWT, createPlaylist)

/**
 * @swagger
 * /api/v1/playlists/all:
 *   get:
 *     summary: Get all public playlists
 *     description: Retrieve paginated list of public playlists with optional filtering
 *     tags: [Playlists]
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
 *         description: Number of playlists per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *         description: Filter by playlist category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search playlists by name or description
 *         example: "music videos"
 *     responses:
 *       200:
 *         description: Playlists retrieved successfully
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
 *                   example: "Playlists fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     playlists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Playlist'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Bad request - invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/all').get(getAllPlaylists)

/**
 * @swagger
 * /api/v1/playlists/u:
 *   get:
 *     summary: Get authenticated user's playlists
 *     description: Retrieve all playlists created by the authenticated user
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of playlists per page
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [public, private, unlisted, all]
 *           default: all
 *         description: Filter by visibility status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *         description: Filter by playlist category
 *     responses:
 *       200:
 *         description: User playlists retrieved successfully
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
 *                   example: "User playlists fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     playlists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Playlist'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/u').get(verifyJWT,getUserPlaylists)

/**
 * @swagger
 * /api/v1/playlists/add-video:
 *   post:
 *     summary: Add video to playlist
 *     description: Add a video to an existing playlist - only playlist owner can add videos
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playlistId
 *               - videoId
 *             properties:
 *               playlistId:
 *                 type: string
 *                 description: Playlist ID - must be owned by the authenticated user
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               videoId:
 *                 type: string
 *                 description: Video ID to add to the playlist
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j2"
 *     responses:
 *       200:
 *         description: Video added to playlist successfully
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
 *                   example: "Video added to playlist successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     playlist:
 *                       $ref: '#/components/schemas/Playlist'
 *                     video:
 *                       $ref: '#/components/schemas/Video'
 *       400:
 *         description: Bad request - invalid playlist or video ID
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
 *         description: Forbidden - only playlist owner can add videos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Not found - playlist or video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - video already exists in playlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/add-video').post(verifyJWT,addVideoToPlaylist)

/**
 * @swagger
 * /api/v1/playlists/remove-video:
 *   post:
 *     summary: Remove video from playlist
 *     description: Remove a video from an existing playlist - only playlist owner can remove videos
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playlistId
 *               - videoId
 *             properties:
 *               playlistId:
 *                 type: string
 *                 description: Playlist ID - must be owned by the authenticated user
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               videoId:
 *                 type: string
 *                 description: Video ID to remove from the playlist
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j2"
 *     responses:
 *       200:
 *         description: Video removed from playlist successfully
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
 *                   example: "Video removed from playlist successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     playlist:
 *                       $ref: '#/components/schemas/Playlist'
 *                     video:
 *                       $ref: '#/components/schemas/Video'
 *       400:
 *         description: Bad request - invalid playlist or video ID
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
 *         description: Forbidden - only playlist owner can remove videos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Not found - playlist or video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - video does not exist in playlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/remove-video').post(verifyJWT,removeVideoFromPlaylist)

/**
 * @swagger
 * /api/v1/playlists/{playlistId}:
 *   get:
 *     summary: Get playlist by ID
 *     description: Retrieve a specific playlist with all videos - respects visibility settings
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *       - in: query
 *         name: includeVideos
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include videos in the response
 *       - in: query
 *         name: videoPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for videos pagination
 *       - in: query
 *         name: videoLimit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of videos per page
 *     responses:
 *       200:
 *         description: Playlist retrieved successfully
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
 *                   example: "Playlist fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     playlist:
 *                       $ref: '#/components/schemas/Playlist'
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - private playlist access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Playlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:playlistId').get(getPlaylistById)

/**
 * @swagger
 * /api/v1/playlists/{playlistId}:
 *   patch:
 *     summary: Update playlist
 *     description: Update playlist details - only playlist owner can update
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated playlist name - must be unique for the user
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "My Updated Playlist"
 *               description:
 *                 type: string
 *                 description: Updated playlist description
 *                 maxLength: 500
 *                 example: "An updated description for my playlist"
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 description: Updated playlist visibility
 *                 example: "private"
 *               category:
 *                 type: string
 *                 enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *                 description: Updated playlist category
 *                 example: "education"
 *               thumbnail:
 *                 type: string
 *                 description: Updated playlist thumbnail URL - S3 hosted image
 *                 example: "https://bucket.s3.region.amazonaws.com/new-thumbnail.jpg"
 *     responses:
 *       200:
 *         description: Playlist updated successfully
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
 *                   example: "Playlist updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Playlist'
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
 *         description: Forbidden - only playlist owner can update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Playlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Conflict - playlist name already exists for this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:playlistId').patch(verifyJWT,updatePlaylist)

/**
 * @swagger
 * /api/v1/playlists/{playlistId}:
 *   delete:
 *     summary: Delete playlist
 *     description: Delete a playlist permanently - only playlist owner can delete
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Playlist ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Playlist deleted successfully
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
 *                   example: "Playlist deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedPlaylist:
 *                       $ref: '#/components/schemas/Playlist'
 *                     videoCount:
 *                       type: integer
 *                       description: Number of videos that were in the deleted playlist
 *                       example: 15
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only playlist owner can delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Playlist not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:playlistId').delete(verifyJWT,deletePlaylist)

export default router

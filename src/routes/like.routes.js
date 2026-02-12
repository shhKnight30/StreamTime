import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleLike,getLikes,getUserLikes,isLiked } from "../controllers/like.controller.js";
import { Router } from "express";

const router = Router()

/**
 * @swagger
 * tags:
 *   - name: Likes
 *     description: Like management
 */

/**
 * @swagger
 * /api/v1/likes/toggle:
 *   post:
 *     summary: Toggle like
 *     description: Like or unlike any content - video, tweet, playlist, live stream, or comment
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentId
 *               - contentType
 *             properties:
 *               contentId:
 *                 type: string
 *                 description: ID of the content to like/unlike
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *               contentType:
 *                 type: string
 *                 enum: [video, tweet, playlist, livestream, comment]
 *                 description: Type of content to like/unlike
 *                 example: "video"
 *     responses:
 *       200:
 *         description: Like toggled successfully
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
 *                   example: "Content liked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     liked:
 *                       type: boolean
 *                       description: Current like status after toggle
 *                       example: true
 *                     totalLikes:
 *                       type: integer
 *                       description: Total number of likes for this content
 *                       example: 42
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
 *       404:
 *         description: Not found - content does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/toggle').post(verifyJWT,toggleLike)

/**
 * @swagger
 * /api/v1/likes:
 *   get:
 *     summary: Get likes for a content
 *     description: Retrieve paginated list of users who liked specific content
 *     tags: [Likes]
 *     parameters:
 *       - in: query
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the content to get likes for
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [video, tweet, playlist, livestream, comment]
 *         description: Type of content to get likes for
 *         example: "video"
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
 *         description: Number of likes per page
 *     responses:
 *       200:
 *         description: Likes retrieved successfully
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
 *                   example: "Likes fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     likes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           user:
 *                             $ref: '#/components/schemas/User'
 *                           likedAt:
 *                             type: string
 *                             format: date-time
 *                             description: When the user liked the content
 *                             example: "2024-01-15T10:30:00Z"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     totalLikes:
 *                       type: integer
 *                       description: Total number of likes for this content
 *                       example: 150
 *       400:
 *         description: Bad request - missing required parameters or invalid values
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Not found - content does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/').get(getLikes)

/**
 * @swagger
 * /api/v1/likes/user:
 *   get:
 *     summary: Get authenticated user's likes
 *     description: Retrieve all content liked by the authenticated user with pagination
 *     tags: [Likes]
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
 *         description: Number of likes per page
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [video, tweet, playlist, livestream, comment]
 *         description: Filter by content type
 *         example: "video"
 *     responses:
 *       200:
 *         description: User likes retrieved successfully
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
 *                   example: "User likes fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     likes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           content:
 *                             oneOf:
 *                               - $ref: '#/components/schemas/Video'
 *                               - $ref: '#/components/schemas/Tweet'
 *                               - $ref: '#/components/schemas/Playlist'
 *                               - $ref: '#/components/schemas/LiveStream'
 *                               - $ref: '#/components/schemas/Comment'
 *                           contentType:
 *                             type: string
 *                             enum: [video, tweet, playlist, livestream, comment]
 *                             description: Type of content
 *                             example: "video"
 *                           likedAt:
 *                             type: string
 *                             format: date-time
 *                             description: When the user liked the content
 *                             example: "2024-01-15T10:30:00Z"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     totalLikes:
 *                       type: integer
 *                       description: Total number of likes by this user
 *                       example: 85
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/user').get(verifyJWT,getUserLikes)

/**
 * @swagger
 * /api/v1/likes/check:
 *   get:
 *     summary: Check if authenticated user liked a content
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like status
 *       401:
 *         description: Unauthorized
 */
router.route('/check').get(verifyJWT,isLiked)

export default router
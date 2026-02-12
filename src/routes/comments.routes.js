import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getUserComments,deleteComment,
    updateComment,
    getComments,
    addComment } from "../controllers/comment.controller.js";

const router = Router()

/**
 * @swagger
 * tags:
 *   - name: Comments
 *     description: Comment management
 */

/**
 * @swagger
 * /api/v1/comments/add:
 *   post:
 *     summary: Add a comment
 *     description: Create a comment on any content type - video, tweet, playlist, live stream, or another comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - contentType
 *               - contentId
 *             properties:
 *               content:
 *                 type: string
 *                 description: Comment content - supports text and basic formatting
 *                 minLength: 1
 *                 maxLength: 100000
 *                 example: "Great video! Really enjoyed the explanation of React hooks."
 *               contentType:
 *                 type: string
 *                 enum: [comment, video, tweet, playlist, livestream]
 *                 description: Type of content being commented on
 *                 example: "video"
 *               contentId:
 *                 type: string
 *                 description: ID of the content being commented on
 *                 example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       201:
 *         description: Comment created successfully
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
 *                   example: "Comment created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Comment'
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
 *         description: Not found - parent content does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/add').post(verifyJWT, addComment)

/**
 * @swagger
 * /api/v1/comments:
 *   get:
 *     summary: Get comments
 *     description: Retrieve paginated comments for specific content with filtering options
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [comment, video, tweet, playlist, livestream]
 *         description: Type of content to get comments for
 *         example: "video"
 *       - in: query
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the content to get comments for
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
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
 *         description: Number of comments per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, popular]
 *           default: "newest"
 *         description: Sort comments by specified criteria
 *         example: "newest"
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
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
 *                   example: "Comments fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     totalCount:
 *                       type: integer
 *                       description: Total number of comments
 *                       example: 45
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
router.route('/').get(getComments)

/**
 * @swagger
 * /api/v1/comments/user:
 *   get:
 *     summary: Get authenticated user's comments
 *     description: Retrieve all comments made by the authenticated user with pagination
 *     tags: [Comments]
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
 *         description: Number of comments per page
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [comment, video, tweet, playlist, livestream]
 *         description: Filter by content type
 *     responses:
 *       200:
 *         description: User comments retrieved successfully
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
 *                   example: "User comments fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/user').get(verifyJWT,getUserComments)

/**
 * @swagger
 * /api/v1/comments/{commentId}:
 *   patch:
 *     summary: Update a comment
 *     description: Update comment content - only comment owner can update
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated comment content
 *                 minLength: 1
 *                 maxLength: 100000
 *                 example: "Updated comment content with better explanation"
 *     responses:
 *       200:
 *         description: Comment updated successfully
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
 *                   example: "Comment updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request - validation errors or empty content
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
 *         description: Forbidden - only comment owner can update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:commentId').patch(verifyJWT,updateComment)

/**
 * @swagger
 * /api/v1/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Delete a comment permanently - only comment owner or content owner can delete
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Comment deleted successfully
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
 *                   example: "Comment deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedComment:
 *                       $ref: '#/components/schemas/Comment'
 *                     contentType:
 *                       type: string
 *                       description: Type of content the comment was on
 *                       example: "video"
 *                     contentId:
 *                       type: string
 *                       description: ID of the content the comment was on
 *                       example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only comment owner or content owner can delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:commentId').delete(verifyJWT,deleteComment)
export default router
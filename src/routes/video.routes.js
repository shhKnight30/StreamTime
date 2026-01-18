import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    uploadVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    getUserVideos,
    searchVideos
} from "../controllers/video.controller.js"
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

/**
 * @swagger
 * /api/v1/video/upload:
 *   post:
 *     summary: Upload a new video
 *     description: Upload a video with optional thumbnail
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - videoFile
 *               - title
 *             properties:
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: Video file to upload
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Optional thumbnail image
 *               title:
 *                 type: string
 *                 description: Video title
 *               description:
 *                 type: string
 *                 description: Video description
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 description: Video visibility
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               category:
 *                 type: string
 *                 enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *                 description: Video category
 *     responses:
 *       201:
 *         description: Video uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *                 message:
 *                   type: string
 */
router.post("/upload", 
    verifyJWT, 
    upload.fields([
        {name : "videoFile",  maxcount: 1},
        {name : "thumbnail", maxcount : 1}
    ]),
    uploadVideo
);

/**
 * @swagger
 * /api/v1/video:
 *   get:
 *     summary: Get all public videos
 *     description: Retrieve paginated list of public videos with optional filtering
 *     tags: [Video]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *     responses:
 *       200:
 *         description: Videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                 message:
 *                   type: string
 */
router.route('/').get(getAllVideos);


/**
 * @swagger
 * /api/v1/video/search:
 *   get:
 *     summary: Search videos
 *     description: Search videos by text, category, or tags with pagination
 *     tags: [Video]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches title, description, tags, owner)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *     responses:
 *       200:
 *         description: Videos found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                 message:
 *                   type: string
 */
router.route('/search').get(searchVideos)
/**
 * @swagger
 * /api/v1/video/user/videos:
 *   get:
 *     summary: Get current user's videos
 *     description: Retrieve paginated list of videos uploaded by current user
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: User videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                 message:
 *                   type: string
 */
router.route('/user/videos').get(verifyJWT,getUserVideos);

/**
 * @swagger
 * /api/v1/video/{videoId}:
 *   get:
 *     summary: Get video by ID
 *     description: Retrieve a single video by its ID
 *     tags: [Video]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *                 message:
 *                   type: string
 *       404:
 *         description: Video not found
 *       403:
 *         description: Access denied (private video)
 */
router.route('/:videoId').get(getVideoById);

/**
 * @swagger
 * /api/v1/video/{videoId}:
 *   patch:
 *     summary: Update video
 *     description: Update video details (owner only)
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated video title
 *               description:
 *                 type: string
 *                 description: Updated video description
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 description: Updated visibility
 *               tags:
 *                 type: string
 *                 description: Updated tags (comma-separated)
 *               category:
 *                 type: string
 *                 enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *                 description: Updated category
 *     responses:
 *       200:
 *         description: Video updated successfully
 *       403:
 *         description: Unauthorized (not owner)
 *       404:
 *         description: Video not found
 */
router.route("/:videoId").patch(verifyJWT,updateVideo);

/**
 * @swagger
 * /api/v1/video/{videoId}:
 *   delete:
 *     summary: Delete video
 *     description: Delete a video (owner only)
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *       403:
 *         description: Unauthorized (not owner)
 *       404:
 *         description: Video not found
*/
router.route("/:videoId").delete(verifyJWT,deleteVideo);
export default router

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
 *     description: Upload a video with automatic thumbnail generation or custom thumbnail
 *     tags: [Videos]
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
 *                 description: Video file to upload - MP4, AVI, MOV, etc. max 100MB
 *                 example: video.mp4
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Optional custom thumbnail image - JPEG, PNG, WebP max 5MB. If not provided, thumbnail will be generated from video at 1 second mark.
 *               title:
 *                 type: string
 *                 description: Video title - required
 *                 example: "My Awesome Video"
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 description: Video description - optional, defaults to Video From StreamTime
 *                 example: "This is an amazing video about..."
 *                 maxLength: 5000
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 description: Video visibility setting - default is public
 *                 example: "public"
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags for categorization
 *                 example: "tutorial,programming,web-development"
 *               category:
 *                 type: string
 *                 enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *                 description: Video category - default is entertainment
 *                 example: "education"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Video uploaded successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Video'
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
 *       413:
 *         description: Payload too large - video file exceeds 100MB limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Internal server error - upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
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
 *     description: Retrieve paginated list of public videos with optional filtering by category and tags
 *     tags: [Videos]
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
 *           default: 10
 *         description: Number of videos per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *         description: Filter by video category
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags - comma-separated
 *         example: "tutorial,programming"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Videos fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
*/
router.get("/", getAllVideos);

router.get("/user", verifyJWT, getUserVideos);
router.get("/search", searchVideos);
/**
 * @swagger
 * /api/v1/video/{videoId}:
 *   get:
 *     summary: Get video by ID
 *     description: Retrieve a specific video by its ID. Increments view count.
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Video fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - private video access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get("/:videoId", verifyJWT, getVideoById);

/**
 * @swagger
 * /api/v1/video/{videoId}:
 *   patch:
 *     summary: Update video details
 *     description: Update video metadata - only owner can update
 *     tags: [Videos]
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
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 description: Updated video description
 *                 maxLength: 5000
 *               visibility:
 *                 type: string
 *                 enum: [public, private, unlisted]
 *                 description: Updated visibility setting
 *               tags:
 *                 type: string
 *                 description: Updated tags - comma-separated
 *               category:
 *                 type: string
 *                 enum: [entertainment, education, news, gaming, music, technology, business, lifestyle, sports, cooking, travel, fitness, science, art, comedy, other]
 *                 description: Updated category
 *     responses:
 *       200:
 *         description: Video updated successfully
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
 *                   example: "Video Details Successfully updated"
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - only video owner can update
 *       404:
 *         description: Video not found
 */
router.patch("/:videoId", verifyJWT, updateVideo);
router.delete("/:videoId", verifyJWT, deleteVideo);

export default router;

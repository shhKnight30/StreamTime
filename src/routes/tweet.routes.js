import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet,deleteTweet,getTweets,getTweetById,getUserTimeline, getMentions, getTweetsByHashtag, getTrendingHashtags } from "../controllers/tweet.controller.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

/**
 * @swagger
 * tags:
 *   - name: Tweets
 *     description: Tweet endpoints
 */

/**
 * @swagger
 * /api/v1/tweets/create:
 *   post:
 *     summary: Create a new tweet
 *     description: Create a tweet with optional media attachments, mentions, and hashtags
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Tweet content - max 280 characters, supports @mentions and #hashtags
 *                 maxLength: 280
 *                 example: "Hello world! Working on my new project @john #webdev"
 *               visibility:
 *                 type: string
 *                 enum: [public, private]
 *                 default: public
 *                 description: Tweet visibility - public everyone, private only followers
 *                 example: "public"
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Media files - images or videos, max 4 files, max 100MB each
 *                 maxItems: 4
 *     responses:
 *       201:
 *         description: Tweet created successfully
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
 *                   example: "Tweet created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Tweet'
 *       400:
 *         description: Bad request - validation errors or content too long
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
 *         description: Payload too large - media files exceed limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/create').post(verifyJWT,
            upload.fields([{
                name:"media", maxCount:4
            }]),
        createTweet)

/**
 * @swagger
 * /api/v1/tweets/timeline:
 *   get:
 *     summary: Get user timeline
 *     description: Retrieve timeline with tweets from followed users and user's own tweets, sorted by most recent
 *     tags: [Tweets]
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
 *         description: Number of tweets per page
 *       - in: query
 *         name: includeRetweets
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include retweets in timeline
 *     responses:
 *       200:
 *         description: Timeline retrieved successfully
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
 *                   example: "Timeline fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tweet'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/timeline').get(verifyJWT,getUserTimeline)

/**
 * @swagger
 * /api/v1/tweets/my-tweets:
 *   get:
 *     summary: Get authenticated user's tweets
 *     description: Retrieve paginated list of tweets created by the authenticated user
 *     tags: [Tweets]
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
 *           default: 10
 *         description: Number of tweets per page
 *       - in: query
 *         name: includeMedia
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include tweets with media only
 *     responses:
 *       200:
 *         description: User tweets retrieved successfully
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
 *                   example: "User tweets fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tweet'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/my-tweets').get(verifyJWT,getTweets)

/**
 * @swagger
 * /api/v1/tweets/{tweetId}:
 *   get:
 *     summary: Get tweet by ID
 *     description: Retrieve a specific tweet by its ID with full details and media
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tweetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tweet ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Tweet retrieved successfully
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
 *                   example: "Tweet fetched successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Tweet'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - private tweet access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Tweet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:tweetId').get(verifyJWT,getTweetById)

/**
 * @swagger
 * /api/v1/tweets/{tweetId}:
 *   delete:
 *     summary: Delete tweet
 *     description: Delete a tweet and its associated media files from S3 - only tweet owner can delete
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tweetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tweet ID
 *         example: "64f1a2b3c4d5e6f7g8h9i0j1"
 *     responses:
 *       200:
 *         description: Tweet deleted successfully
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
 *                   example: "Tweet deleted successfully"
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - only tweet owner can delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Tweet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/:tweetId').delete(verifyJWT,deleteTweet)

/**
 * @swagger
 * /api/v1/tweets/mentions:
 *   get:
 *     summary: Get tweets mentioning the authenticated user
 *     description: Retrieve tweets where the authenticated user is mentioned with @username
 *     tags: [Tweets]
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
 *         description: Number of tweets per page
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Filter by read/unread status
 *     responses:
 *       200:
 *         description: Mentions retrieved successfully
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
 *                   example: "Mentions fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tweet'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     unreadCount:
 *                       type: integer
 *                       description: Number of unread mentions
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/mentions').get(verifyJWT, getMentions)

/**
 * @swagger
 * /api/v1/tweets/hashtags/{hashtag}:
 *   get:
 *     summary: Get tweets by hashtag
 *     description: Retrieve tweets containing a specific hashtag #hashtag
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hashtag
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashtag without the # symbol
 *         example: "webdev"
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
 *         description: Number of tweets per page
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, year, all]
 *           default: all
 *         description: Filter by timeframe
 *     responses:
 *       200:
 *         description: Hashtag tweets retrieved successfully
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
 *                   example: "Hashtag tweets fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     hashtag:
 *                       type: string
 *                       example: "webdev"
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tweet'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     tweetCount:
 *                       type: integer
 *                       description: Total number of tweets with this hashtag
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: No tweets found for this hashtag
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/hashtags/:hashtag').get(verifyJWT, getTweetsByHashtag)

/**
 * @swagger
 * /api/v1/tweets/trending:
 *   get:
 *     summary: Get trending hashtags
 *     description: Retrieve trending hashtags based on tweet volume in the last 24 hours
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of trending hashtags to return
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *           default: day
 *         description: Timeframe for trending calculation
 *     responses:
 *       200:
 *         description: Trending hashtags retrieved successfully
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
 *                   example: "Trending hashtags fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     trending:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hashtag:
 *                             type: string
 *                             example: "webdev"
 *                           tweetCount:
 *                             type: integer
 *                             example: 1250
 *                           growth:
 *                             type: number
 *                             description: Percentage growth from previous period
 *                             example: 45.5
 *                           topTweets:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Tweet'
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route('/trending').get(verifyJWT, getTrendingHashtags)

export default router

/**
 * @swagger
 * /api/v1/video/{videoId}:
 *   delete:
 *     summary: Delete video
 *     description: Delete a video and its associated files from S3 (only owner can delete)
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
 *     responses:
 *       200:
 *         description: Video deleted successfully
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
 *                   example: "Video deleted Successfully"
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - only video owner can delete
 *       404:
 *         description: Video not found
 */

/**
 * @swagger
 * /api/v1/video/user:
 *   get:
 *     summary: Get current user's videos
 *     description: Retrieve paginated list of videos uploaded by the authenticated user
 *     tags: [Videos]
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
 *         description: Number of videos per page
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "user videos fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - authentication required
 */

/**
 * @swagger
 * /api/v1/video/search:
 *   get:
 *     summary: Search videos
 *     description: Search videos by text query, category, or tags with pagination
 *     tags: [Videos]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches in title, description, tags, owner name, owner username)
 *         example: "javascript tutorial"
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
 *         description: Filter by tags (comma-separated)
 *         example: "tutorial,programming,web-development"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Videos found Successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Bad request - invalid search parameters
 */

// Tweet Routes Documentation

/**
 * @swagger
 * /api/v1/tweet:
 *   post:
 *     summary: Create a new tweet
 *     description: Create a tweet with optional media attachments
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
 *                 description: Tweet content (max 280 characters)
 *                 maxLength: 280
 *                 example: "Hello world! This is my first tweet."
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Media files (images or videos, max 100MB each, max 4 files)
 *               visibility:
 *                 type: string
 *                 enum: [public, private]
 *                 default: public
 *                 description: Tweet visibility
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
 *         description: Bad request - validation errors
 *       401:
 *         description: Unauthorized - authentication required
 *       413:
 *         description: Payload too large - media files exceed limit
 */

/**
 * @swagger
 * /api/v1/tweet:
 *   get:
 *     summary: Get all tweets
 *     description: Retrieve paginated list of public tweets
 *     tags: [Tweets]
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
 *     responses:
 *       200:
 *         description: Tweets retrieved successfully
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
 *                   example: "Tweets fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tweets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tweet'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/v1/tweet/{tweetId}:
 *   get:
 *     summary: Get tweet by ID
 *     description: Retrieve a specific tweet by its ID
 *     tags: [Tweets]
 *     parameters:
 *       - in: path
 *         name: tweetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tweet ID
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
 *       404:
 *         description: Tweet not found
 */

/**
 * @swagger
 * /api/v1/tweet/{tweetId}:
 *   patch:
 *     summary: Update tweet
 *     description: Update tweet content (only owner can update)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated tweet content (max 280 characters)
 *                 maxLength: 280
 *               visibility:
 *                 type: string
 *                 enum: [public, private]
 *                 description: Updated visibility setting
 *     responses:
 *       200:
 *         description: Tweet updated successfully
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
 *                   example: "Tweet updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Tweet'
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - only tweet owner can update
 *       404:
 *         description: Tweet not found
 */

/**
 * @swagger
 * /api/v1/tweet/{tweetId}:
 *   delete:
 *     summary: Delete tweet
 *     description: Delete a tweet and its associated media files (only owner can delete)
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
 *       403:
 *         description: Forbidden - only tweet owner can delete
 *       404:
 *         description: Tweet not found
 */

/**
 * @swagger
 * /api/v1/tweet/user:
 *   get:
 *     summary: Get current user's tweets
 *     description: Retrieve paginated list of tweets by the authenticated user
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
 */

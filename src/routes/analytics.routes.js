import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getVideoAnalytics,
     getUserAnalytics, 
     getLiveStreamAnalytics,
      updateVideoViews } from "../controllers/analytics.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Analytics
 *     description: Analytics endpoints
 */

/**
 * @swagger
 * /api/v1/analytics/video/{videoId}:
 *   get:
 *     summary: Get video analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video analytics
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.route('/video/:videoId').get(verifyJWT, getVideoAnalytics);

/**
 * @swagger
 * /api/v1/analytics/user:
 *   get:
 *     summary: Get authenticated user's analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User analytics
 *       401:
 *         description: Unauthorized
 */
router.route('/user').get(verifyJWT, getUserAnalytics);

/**
 * @swagger
 * /api/v1/analytics/stream/{streamId}:
 *   get:
 *     summary: Get live stream analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: streamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Live stream analytics
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
router.route('/stream/:streamId').get(verifyJWT, getLiveStreamAnalytics);

/**
 * @swagger
 * /api/v1/analytics/video/{videoId}/views:
 *   patch:
 *     summary: Increment video views
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated view count
 *       404:
 *         description: Not found
 */
router.route('/video/:videoId/views').patch(updateVideoViews);

export default router;
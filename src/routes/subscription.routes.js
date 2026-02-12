import { verifyJWT } from "../middlewares/auth.middleware.js";
import { subscribeToChannel,unsubscribeFromChannel,getChannelSubscribers,getUserSubscriptions,checkSubscriptionStatus } from "../controllers/subscription.controller.js";
// import route/r from "./video.routes.js";
import { Router } from "express";
const router = Router()

// router.route('/')

/**
 * @swagger
 * tags:
 *   - name: Subscriptions
 *     description: Channel subscription management
 */

/**
 * @swagger
 * /api/v1/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to a channel
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channelId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscribed
 *       401:
 *         description: Unauthorized
 */
router.route('/subscribe').post(verifyJWT,subscribeToChannel)

/**
 * @swagger
 * /api/v1/subscriptions/unsubscribe:
 *   post:
 *     summary: Unsubscribe from a channel
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channelId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unsubscribed
 *       401:
 *         description: Unauthorized
 */
router.route('/unsubscribe').post(verifyJWT,unsubscribeFromChannel)

/**
 * @swagger
 * /api/v1/subscriptions/channel/{channelId}/subscribers:
 *   get:
 *     summary: Get channel subscribers
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscribers list
 */
router.route('/channel/:channelId/subscribers').get(getChannelSubscribers)

/**
 * @swagger
 * /api/v1/subscriptions/user/subscriptions:
 *   get:
 *     summary: Get authenticated user's subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscriptions list
 *       401:
 *         description: Unauthorized
 */
router.route('/user/subscriptions').get(verifyJWT,getUserSubscriptions)

/**
 * @swagger
 * /api/v1/subscriptions/check/{channelId}:
 *   get:
 *     summary: Check subscription status to a channel
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription status
 *       401:
 *         description: Unauthorized
 */
router.route('/check/:channelId').get(verifyJWT,checkSubscriptionStatus)
export default router
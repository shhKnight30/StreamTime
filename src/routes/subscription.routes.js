import { verifyJWT } from "../middlewares/auth.middleware.js";
import { subscribeToChannel,unsubscribeFromChannel,getChannelSubscribers,getUserSubscriptions,checkSubscriptionStatus } from "../controllers/subscription.controller.js";
// import route/r from "./video.routes.js";
import { Router } from "express";
const router = Router()

// router.route('/')
router.route('/subscribe').post(verifyJWT,subscribeToChannel)
router.route('/unsubscribe').post(verifyJWT,unsubscribeFromChannel)
router.route('/channel/:channelId/subscribers').get(getChannelSubscribers)
router.route('/user/subscriptions').get(verifyJWT,getUserSubscriptions)
router.route('/check/:channelId').get(verifyJWT,checkSubscriptionStatus)
export default router
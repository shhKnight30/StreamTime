import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getVideoAnalytics,
     getUserAnalytics, 
     getLiveStreamAnalytics,
      updateVideoViews } from "../controllers/analytics.controller.js";

const router = Router();

router.route('/video/:videoId').get(verifyJWT, getVideoAnalytics);
router.route('/user').get(verifyJWT, getUserAnalytics);
router.route('/stream/:streamId').get(verifyJWT, getLiveStreamAnalytics);
router.route('/video/:videoId/views').patch(updateVideoViews);

export default router;
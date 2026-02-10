import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createLiveStream,getLiveStreamById,getLiveStreams,updateLiveStream,deleteLiveStream,startLiveStream,stopLiveStream } from "../controllers/liveStream.controller.js";

const router = Router()
router.route('/create').post(verifyJWT,createLiveStream)
router.route('/').get(getLiveStreams)
router.route('/:streamId').get(getLiveStreamById)
router.route('/:streamId').patch(verifyJWT,updateLiveStream)
router.route('/:streamId').delete(verifyJWT,deleteLiveStream)
router.route('/:streamId/start').post(verifyJWT,startLiveStream)
router.route('/:streamId/stop').post(verifyJWT,stopLiveStream)

export default router
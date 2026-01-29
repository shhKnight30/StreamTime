import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet,deleteTweet,getTweets,getTweetById,getUserTimeline } from "../controllers/tweet.controller.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route('/create').post(verifyJWT,
            upload.fields([{
                name:"media", maxCount:4
            }]),
        createTweet)

router.route('/timeline').get(verifyJWT,getUserTimeline)
router.route('/my-tweets').get(verifyJWT,getTweets)
router.route('/:tweetId').get(verifyJWT,getTweetById)
router.route('/:tweetId').delete(verifyJWT,deleteTweet)
export default router

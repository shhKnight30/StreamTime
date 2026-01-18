import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleLike,getLikes,getUserLikes,isLiked } from "../controllers/like.controller.js";
import { Router } from "express";

const router = Router()

router.route('/toggle').post(verifyJWT,toggleLike)
router.route('/').get(getLikes)
router.route('/user').get(verifyJWT,getUserLikes)
router.route('/check').get(verifyJWT,isLiked)

export default router
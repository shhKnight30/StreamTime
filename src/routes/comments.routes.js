import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getUserComments,deleteComment,
    updateComment,
    getComments,
    addComment } from "../controllers/comment.controller.js";

const router = Router()

router.route('/add').post(verifyJWT, addComment)
router.route('/').get(getComments)
router.route('/user').get(verifyJWT,getUserComments)
router.route('/:commentId').patch(verifyJWT,updateComment)
router.route('/:commentId').delete(verifyJWT,deleteComment)
export default router
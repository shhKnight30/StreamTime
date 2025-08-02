import { Router } from "express";

import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"; 
const router = Router()
router.route("/register").post(
    upload.fields([{
        name:"avatar",
        maxCount:1
    },{
        name:"coverImage",
        maxCount:1
    }])

    ,registerUser)
// router.route("/register").post(upload.single({name:"avatar",maxcount:1}),registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(logoutUser)
router.route("/refresh-token").post(refreshAccessToken)


export default router
import { Router } from "express";
import multer from "multer";

import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"; 
// const upload = multer({storage})
const router = Router()
router.route("/register").post(
    upload.fields([{
        name:"avatar",
        maxcount:1
    },{
        name:"coverImage",
        maxcount:1
    }])

    ,registerUser)
// router.route("/register").post(upload.single({name:"avatar",maxcount:1}),registerUser)


export default router
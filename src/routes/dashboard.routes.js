// src/routes/dashboard.routes.js  (new file)
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getDashboardStats, getDashboardVideos } from "../controllers/dashboard.controller.js";

const router = Router()

router.use(verifyJWT) // all dashboard routes require auth

router.route("/stats").get(getDashboardStats)
router.route("/videos").get(getDashboardVideos)

export default router
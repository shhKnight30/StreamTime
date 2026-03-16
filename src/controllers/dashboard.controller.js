// src/controllers/dashboard.controller.js  (new file)
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * GET /api/v1/dashboard/stats
 * Returns aggregate stats for the authenticated user's channel
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.user._id

    // Total videos uploaded by this user
    const totalVideos = await Video.countDocuments({ owner: userId })

    // Sum of all views across user's videos
    const viewsAgg = await Video.aggregate([
        { $match: { owner: userId } },
        { $group: { _id: null, totalViews: { $sum: "$views" }, totalLikes: { $sum: "$likes" } } }
    ])
    const totalViews = viewsAgg[0]?.totalViews || 0
    const totalLikes = viewsAgg[0]?.totalLikes || 0

    // Subscriber count is denormalized on the User document
    const user = await User.findById(userId).select("subscriberCount")
    const totalSubscribers = user?.subscriberCount || 0

    return res.status(200).json(
        new ApiResponse(200, {
            totalVideos,
            totalViews,
            totalLikes,
            totalSubscribers
        }, "Dashboard stats retrieved successfully")
    )
})

/**
 * GET /api/v1/dashboard/videos
 * Returns the authenticated user's uploaded videos for dashboard management
 */
const getDashboardVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query
    const userId = req.user._id

    const videos = await Video.find({ owner: userId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("title thumbnail views likes isPublished duration createdAt visibility")

    const total = await Video.countDocuments({ owner: userId })

    return res.status(200).json(
        new ApiResponse(200, {
            videos,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }, "Dashboard videos retrieved successfully")
    )
})

export { getDashboardStats, getDashboardVideos }
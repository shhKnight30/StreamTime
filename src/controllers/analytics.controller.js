import { VideoAnalytics } from "../models/videoAnalytics.models.js";
import { UserAnalytics } from "../models/userAnalytics.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { LiveStreamAnalytics } from "../models/liveStreamAnalytics.models.js";
import { redis } from "../utils/cache.js";
const getVideoAnalytics = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Find or create — analytics doc may not exist for older videos
    let analytics = await VideoAnalytics.findOne({ video: videoId })
        .populate('video', 'title thumbnail');

    if (!analytics) {
        analytics = await VideoAnalytics.create({ video: videoId })
        analytics = await analytics.populate('video', 'title thumbnail')
    }

    return res.status(200).json(
        new ApiResponse(200, analytics, "Video analytics retrieved successfully")
    );
});

// User Analytics
const getUserAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const analytics = await UserAnalytics.findOne({ user: userId });
    
    if (!analytics) {
        // Create analytics if doesn't exist
        const newAnalytics = await UserAnalytics.create({ user: userId });
        return res.status(200).json(
            new ApiResponse(200, newAnalytics, "User analytics created successfully")
        );
    }
    
    return res.status(200).json(
        new ApiResponse(200, analytics, "User analytics retrieved successfully")
    );
});

// Live Stream Analytics
const getLiveStreamAnalytics = asyncHandler(async (req, res) => {
    const { streamId } = req.params;
    
    const analytics = await LiveStreamAnalytics.findOne({ stream: streamId })
        .populate('stream', 'title startTime endTime');
    
    if (!analytics) {
        throw new ApiError(404, "Live stream analytics not found");
    }
    
    return res.status(200).json(
        new ApiResponse(200, analytics, "Live stream analytics retrieved successfully")
    );
});

// Update Video Views
// analytics.controller.js — updateVideoViews (add IP/user deduplication)
const updateVideoViews = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const viewerId = req.user?._id?.toString() || req.ip;
    
    // Prevent duplicate views within 1 hour per viewer
    const cacheKey = `view:${videoId}:${viewerId}`;
    if (redis) {
        const alreadyViewed = await redis.get(cacheKey);
        if (alreadyViewed) {
            return res.status(200).json(new ApiResponse(200, {}, "View already recorded"));
        }
        await redis.setex(cacheKey, 3600, '1'); // 1 hour TTL
    }
    
    // Update both models atomically
    const [analytics] = await Promise.all([
        VideoAnalytics.findOneAndUpdate(
            { video: videoId },
            { $inc: { views: 1 } },
            { upsert: true, new: true }
        ),
        Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } })
    ]);
    
    return res.status(200).json(
        new ApiResponse(200, { views: analytics.views }, "View recorded successfully")
    );
});

export {
    getVideoAnalytics,
    getUserAnalytics,
    getLiveStreamAnalytics,
    updateVideoViews
};
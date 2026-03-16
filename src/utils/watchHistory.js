import { User } from "../models/user.models.js"

export const addToWatchHistory = async (userId, videoId) => {
    try {
        // Remove if already present, then prepend — keeps list unique and ordered by recency
        await User.findByIdAndUpdate(userId, { $pull: { watchHistory: videoId } })
        await User.findByIdAndUpdate(userId, {
            $push: { watchHistory: { $each: [videoId], $position: 0 } }
        })
    } catch (e) {
        // Non-critical — don't crash the video response if history update fails
    }
}
import { User } from "../models/user.models.js"
import mongoose from "mongoose";
export const addToWatchHistory = async (userId, videoId) => {
    try {
        const MAX_HISTORY = 200;
        await User.findByIdAndUpdate(userId, [
            // Stage 1: Remove existing occurrence
            { $set: { watchHistory: { 
                $filter: { 
                    input: "$watchHistory", 
                    cond: { $ne: ["$$this", new mongoose.Types.ObjectId(videoId)] }
                }
            }}},
            // Stage 2: Prepend and limit
            { $set: { watchHistory: { 
                $slice: [
                    { $concatArrays: [[new mongoose.Types.ObjectId(videoId)], "$watchHistory"] },
                    MAX_HISTORY
                ]
            }}}
        ]);
    } catch (e) {
        logger.warn('Watch history update failed (non-critical):', e.message);
    }
};
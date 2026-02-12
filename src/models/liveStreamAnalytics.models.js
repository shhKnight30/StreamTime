// Track live stream performance
import mongoose, { Schema } from "mongoose";
const liveStreamAnalyticsSchema = new Schema({
    stream: { type: Schema.Types.ObjectId, ref: 'LiveStream', required: true },
    peakViewers: { type: Number, default: 0 },
    averageViewers: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 }, // seconds
    revenue: {
        donations: { type: Number, default: 0 },
        subscriptions: { type: Number, default: 0 }
    },
    engagement: {
        chatMessages: { type: Number, default: 0 },
        newFollowers: { type: Number, default: 0 }
    }
}, { timestamps: true });

export const LiveStreamAnalystics = mongoose.model('liveStreamAnalystics',liveStreamAnalyticsSchema)
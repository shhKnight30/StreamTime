import mongoose, { Schema  } from "mongoose";

const videoAnalyticsSchema = new Schema({
    video: { 
        type: Schema.Types.ObjectId,
        ref: 'Video',
        required: true 
    },
    views: { 
        type: Number, 
        default: 0 
    },
    uniqueViews: { 
        type: Number, 
        default: 0 
    },
    watchTime: { 
        type: Number, 
        default: 0 
    },
    engagement: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
    },
    demographics: {
        ageGroups: [String],
        countries: [String],
        devices: [String]
    },
    performance: {
        averageWatchTime: Number,
        retentionRate: Number,
        clickThroughRate: Number
    }

}, { timestamps: true })

export const VideoAnalytics = mongoose.model('VideoAnalytics',videoAnalyticsSchema)



import mongoose, { Schema } from "mongoose";
const userAnalyticsSchema = new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    totalViews:{
        type:Number,
        default:0,
    },
    totalWatchTime:{
        type:Number,
        default:0
    },
    engagement :{
        videosUploaded: {type:Number, default:0},
        totalLikes:{type:Number, default:0},
        totalComments : {type: Number,default:0}
    },
    growth:{
        followerGained : {
            type:Number,
            default:0
        },
        subscriberGained:{
            type:Number,
            default:0
        }
    },
    activity:[{
        date:Date,
        action:String,
        contentId:Schema.Types.ObjectId
    }]
},{timestamps:true})

export const UserAnalytics = mongoose.model('userAnalytics',userAnalyticsSchema)
import mongoose,{Schema} from "mongoose";

const likeSchema = new Schema({
    user:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    contentType: { 
        type: String, 
        enum: ['comment', 'video', 'tweet', 'playlist','livestream'], 
        required: true 
    },
    contentId:{ 
        type: Schema.Types.ObjectId,
        required: true, refPath: 'contentType'
    },
    reaction:{
        type: String,
        enum: ['like'],  
        default: 'like'
    }
},{timestamps:true})
likeSchema.index({ user: 1, contentType: 1, contentId: 1 }, { unique: true })
export const Like = mongoose.model("Like",likeSchema);


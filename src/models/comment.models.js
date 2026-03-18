import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
// import  "./user.models.js";
// import "./video.models.js";
const commentSchema = new Schema({
    content : {
        type : String,
        required : true,
        trim : true,
        maxlength : 100000
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    parentContentType: { 
        type: String, 
        enum: ['Comment', 'Video', 'Tweet', 'Playlist', 'Livestream'], 
        required: true 
    },
    parentContentId: { 
        type: Schema.Types.ObjectId,
        required: true, 
        refPath: 'parentContentType'
    },
    
}, {timestamps:true})
commentSchema.plugin(mongooseAggregatePaginate);
export const Comment = mongoose.model("Comment",commentSchema);

import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

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
        enum: ['comment', 'video', 'tweet', 'playlist'], 
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

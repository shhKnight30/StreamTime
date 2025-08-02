import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
    content:{
        type:String,
        required:true
    },
    video:{
        type:Schema.Types.ObjectId,
        ref:"video"
    },
    comment:{
        type:Schema.Types.ObjectId,
        ref:"comment"
    },
    tweet:{
        type:Schema.Types.ObjectId,
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User",
    }
})
commentSchema.plugin(mongooseAggregatePaginate);
export const Comment = mongoose.model("Comment",commentSchema);

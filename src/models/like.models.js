import mongoose,{Schema} from "mongoose";

const likeSchema = new Schema({
    user:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    comment:{
        type:Schema.Types.ObjectId,
        ref:"comment"
    },
    video:{
        type:Schema.Types.ObjectId,
        ref:"video"
    },
    tweet:{
        type:Schema.Types.ObjectId,
        ref:"tweet" 
    }
},{timestamps:true})

const Like = mongoose.model("Like",likeSchema);

export default Like;
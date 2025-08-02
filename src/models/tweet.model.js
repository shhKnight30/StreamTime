// import { Schema } from "mongoose";
import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
// mongooseAggregatePaginate
const tweetSchema = new Schema({
    content:{
        type: String,
        Required:true
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },

},{
    timestamps:true
})

tweetSchema.plugin(mongooseAggregatePaginate)
export const Tweet = mongoose.model('Tweet',tweetSchema)

// import { Schema } from "mongoose";
import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const tweetSchema = new Schema({
    content: {
        type: String,
        // required: true,
        required: function() {
            return !this.media || this.media.length === 0;
        },
        trim: true,
        maxlength: 280
    },
    media: [{
        contentType: {
            type: String,
            enum: ['image', 'video'],
            required: true
        },
        url: {
            type: String,
            required: true
        },
        thumbnail: {
            type: String,  
            required: function() {
                return this.contentType === 'video';
            }
        },
        size: {
            type: Number,
            required: true,
            max: 100 * 1024 * 1024  
        },
        filename: String,       
        mimetype: String        
    }],
    likes: { 
        type: Number,
         default: 0 
    },
    shares: { 
        type: Number,
        default: 0
    },
    comments: { 
        type: Number,
        default: 0
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },

},{
    timestamps:true
})

tweetSchema.plugin(mongooseAggregatePaginate)
export const Tweet = mongoose.model('Tweet',tweetSchema)

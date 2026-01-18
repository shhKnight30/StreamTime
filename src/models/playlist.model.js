import mongoose,{Schema} from "mongoose";

const playlistSchema = new Schema({
    name:{
        type:String,
    },
    videos:[{
        type:Schema.Types.ObjectId,
        ref:"video"
    }],
    description :{
        type : String,
        trim : true
    },
    owner: {
        type:Schema.Types.ObjectId,
        ref : 'User',
        required :true
    },
    thumbnail : {
        type : String,
        default : ""
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    category: {
        type: String,
        enum: [
            'entertainment', 'education', 'news', 'gaming', 'music', 
            'technology', 'business', 'lifestyle', 'sports', 'cooking', 
            'travel', 'fitness', 'science', 'art', 'comedy', 'other'
        ],
    },

},{
    timestamps:true
})

export const Playlist = mongoose.model("Playlist",playlistSchema) 

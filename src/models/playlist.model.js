import mongoose,{Schema} from "mongoose";

const playlistSchema = new Schema({
    name:{
        type:String,
    },
    videos:[{
        type:Schema.Types.ObjectId,
        ref:"video"
    }],

},{
    timestamps:true
})

export const Playlist = mongoose.model("Playlist",playlistSchema) 

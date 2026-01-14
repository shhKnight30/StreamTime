import {Schema,model} from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
const videoSchema = Schema({
    videoURL:{
        type:String,
        required:true,
        index:true
    },
    thumbnail:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
        index:true
    },
    description:{
        type:String,
        required:true,
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
        type:Number,
        default:0,
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'unlisted'],
        default: 'public'
    },
    tags: [{
        type: String,
        enum: [
            // content typetags
            'tutorial', 'review', 'vlog', 'gaming', 'music', 'comedy',
            'news', 'documentary', 'interview', 'podcast', 'stream',
            
            // technology
            'programming', 'web-development', 'mobile', 'ai', 'cybersecurity',
            'software', 'hardware', 'gadgets', 'tech-review',
            
            // entertainment
            'movie', 'tv-show', 'anime', 'cartoon', 'trailer', 'clip',
            'funny', 'viral', 'challenge', 'dance', 'music-video',
            
            // edcation
            'science', 'math', 'history', 'language', 'art', 'design',
            'business', 'finance', 'marketing', 'entrepreneurship',
            
            // Lifestyl
            'cooking', 'recipe', 'travel', 'fitness', 'workout', 'health',
            'fashion', 'beauty', 'diy', 'home', 'garden',
            
            //Sports
            'football', 'basketball', 'cricket', 'tennis', 'swimming',
            'running', 'cycling', 'gym', 'yoga', 'sports-news',

            //general 
            'how-to', 'tips', 'guide', 'explanation', 'analysis', 'opinion'
        ]
    }],
    category: {
        type: String,
        enum: [
            'entertainment', 'education', 'news', 'gaming', 'music', 
            'technology', 'business', 'lifestyle', 'sports', 'cooking', 
            'travel', 'fitness', 'science', 'art', 'comedy', 'other'
        ],
        required: true
    },
    isPublished:{
        type:Boolean,
        default:true,
    },
    ownerName: {
    type: String,
    required: true
    },
    ownerUsername: {
        type: String,
        required: true
    },
    ownerAvatar: {
        type: String,
        required: true
    },
    owner:{
            type:Schema.Types.ObjectId,
            ref: "User",
            required:true
    },
    likes:{
        type:Number,
        default : 0,
    },
    dislikes :{
        type:Number,
        default:0,
    }
},
{
    timestamps:true,
})
videoSchema.plugin(mongooseAggregatePaginate)
export const Video = model('Video',videoSchema)
import { Tweet } from "../models/tweet.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscriptions.models.js"; 

const createTweet = asyncHandler(async (req , res )=>{
    const {content , visibility = 'public' } = req.body

    let media = []
    if(req.files && req.files.media){
        const uploadedMedia = await Promise.all(
            req.files.media.map(async (file) =>{
                const result = await uploadOnCloudinary(file.path)
                return {
                    contentType : file.mimetype.startsWith('image/')? 'image':'video',
                    url : result.secure_url,
                    filename: file.originalname,
                    size : file.size,
                    mimetype : file.mimetype
                }
            })
        )
        media = uploadedMedia
    }

    const tweet = await Tweet.create({
        content : content.trim(),
        media,
        user : req.user?._id,
        visibility
    })
    return res.status(201).json(
        new ApiResponse(201, tweet,"Tweet created successfully")
    )
})

const getTweets = asyncHandler(async (req, res)=>{
    const {page = 1 , limit = 10 , contentType } = req.query
    let query = {
        user : req.user?._id,
    }
    if(contentType){
        query.contentType =  contentType
    }
    const tweets = await  Tweet.find(query)
        .populate('user' , ' username fullname avatar')
        .sort({createdAt : -1})
        .limit(limit * 1)
        .skip((page-1)*limit)
    
    const total  = await Tweet.countDocuments(query)

    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            pagination:{
                page,
                limit,
                total,
                pages : Math.ceil(total / limit)
            }
        },"Tweets retrieved successfully")
    )

})

const deleteTweet = asyncHandler(async (req , res) =>{
    const {tweetId } = req.params
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404 , "Tweet not found")
    }
    if(tweet.user.toString()!== req.user?._id.toString()){
        throw new ApiError(403,"unauthorized request to delte the tweet ")
    }
    await Tweet.findByIdAndDelete(tweetId)
    return res.status(200).json(
        new ApiResponse(200, {},"Tweet deleted successfully")
    )
})

const getTweetById = asyncHandler(async (req , res ) =>{
    const {tweetId} = req.params
    const tweet = await Tweet.findById(tweetId)
        .populate('user','username fullname avatar')
    if(!tweet){
        throw new ApiError(404 ,"Tweet not found ")
    }
    return res.status(200).json(
        new ApiResponse(200, tweet, "Tweet retrieved successfully")
    )
})

const getUserTimeline = asyncHandler(async (req , res) =>{
    const following = await Subscription.find({
        subscriber : req.user?._id
    }).select('channel')
    const userIds = [req.user._id, ...following.map(f=>f.channel)]
    const tweets = await Tweet.find({
        user:{
            $in : userIds
        }
    })
    .populate('user','username fullname avatar')
    .sort({createdAt : -1})
    .limit(20)

    return res.status(200).json(
        new ApiResponse(200, {tweets}, "Timeline retrieved successfully")
    )
})

export {
    createTweet,
    deleteTweet,
    getTweets,
    getTweetById,
    getUserTimeline,
}
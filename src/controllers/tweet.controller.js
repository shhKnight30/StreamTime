import { Tweet } from "../models/tweet.model.js";
import { uploadOnS3, deleteFromS3ByKey } from "../utils/aws-s3.js";
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
                const result = await uploadOnS3(file.path, 'tweet-media')
                return {
                    contentType : file.mimetype.startsWith('image/')? 'image':'video',
                    url : result.url,
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
    const {page = 1 , limit = 10 , visibility } = req.query
    let query = {
        user : req.user?._id,
    }
    if(visibility){
    query.visibility = visibility
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
        throw new ApiError(403,"unauthorized request to delete tweet ")
    }
    
    // Delete media files from S3
    if(tweet.media && tweet.media.length > 0){
        for(const mediaItem of tweet.media){
            const key = mediaItem.url.split('/').pop();
            await deleteFromS3ByKey(key);
        }
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

const getMentions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, read } = req.query
    const username = req.user.username
    
    // Find tweets mentioning the user (@username)
    const query = {
        content: { $regex: `@${username}`, $options: 'i' }
    }
    
    const tweets = await Tweet.find(query)
        .populate('user', 'username fullname avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
    
    const total = await Tweet.countDocuments(query)
    
    // TODO: Add read/unread tracking with a Mention model
    const unreadCount = 0 // Placeholder until we implement mention tracking

    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            unreadCount
        }, "Mentions fetched successfully")
    )
})

const getTweetsByHashtag = asyncHandler(async (req, res) => {
    const { hashtag } = req.params
    const { page = 1, limit = 20, timeframe = 'all' } = req.query
    
    // Build query with timeframe filter
    const query = {
        content: { $regex: `#${hashtag}`, $options: 'i' }
    }
    
    // Add timeframe filter
    if (timeframe !== 'all') {
        const now = new Date()
        let timeFilter = {}
        
        switch (timeframe) {
            case 'hour':
                timeFilter = { $gte: new Date(now - 60 * 60 * 1000) }
                break
            case 'day':
                timeFilter = { $gte: new Date(now - 24 * 60 * 60 * 1000) }
                break
            case 'week':
                timeFilter = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) }
                break
            case 'month':
                timeFilter = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) }
                break
            case 'year':
                timeFilter = { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) }
                break
        }
        
        query.createdAt = timeFilter
    }
    
    const tweets = await Tweet.find(query)
        .populate('user', 'username fullname avatar')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
    
    const total = await Tweet.countDocuments({ content: { $regex: `#${hashtag}`, $options: 'i' } })
    
    if (tweets.length === 0) {
        throw new ApiError(404, `No tweets found for hashtag #${hashtag}`)
    }

    return res.status(200).json(
        new ApiResponse(200, {
            hashtag,
            tweets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            tweetCount: total
        }, "Hashtag tweets fetched successfully")
    )
})

const getTrendingHashtags = asyncHandler(async (req, res) => {
    const { limit = 10, timeframe = 'day' } = req.query
    
    // Calculate time filter
    const now = new Date()
    let timeFilter = {}
    
    switch (timeframe) {
        case 'hour':
            timeFilter = { $gte: new Date(now - 60 * 60 * 1000) }
            break
        case 'day':
            timeFilter = { $gte: new Date(now - 24 * 60 * 60 * 1000) }
            break
        case 'week':
            timeFilter = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) }
            break
    }
    
    // Get recent tweets
    const recentTweets = await Tweet.find({
        createdAt: timeFilter
    }).select('content')
    
    // Extract and count hashtags
    const hashtagCounts = {}
    recentTweets.forEach(tweet => {
        const hashtags = tweet.content.match(/#\w+/g) || []
        hashtags.forEach(hashtag => {
            const cleanHashtag = hashtag.substring(1).toLowerCase()
            hashtagCounts[cleanHashtag] = (hashtagCounts[cleanHashtag] || 0) + 1
        })
    })
    
    // Sort by count and get top hashtags
    const trendingHashtags = Object.entries(hashtagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(async ([hashtag, count]) => {
            // Get top tweets for this hashtag
            const topTweets = await Tweet.find({
                content: { $regex: `#${hashtag}`, $options: 'i' }
            })
            .populate('user', 'username fullname avatar')
            .sort({ likes: -1, createdAt: -1 })
            .limit(3)
            
            return {
                hashtag,
                tweetCount: count,
                growth: Math.random() * 100, // Placeholder - would need historical data
                topTweets
            }
        })
    
    const resolvedTrending = await Promise.all(trendingHashtags)

    return res.status(200).json(
        new ApiResponse(200, {
            trending: resolvedTrending
        }, "Trending hashtags fetched successfully")
    )
})

export {
    createTweet,
    deleteTweet,
    getTweets,
    getTweetById,
    getUserTimeline,
    getMentions,
    getTweetsByHashtag,
    getTrendingHashtags,
}
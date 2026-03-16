import { Like } from "../models/like.models.js";
import { Playlist } from "../models/playlist.model.js";
// import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { LiveStream } from "../models/livestream.model.js";
import { Video } from "../models/video.models.js";
const COUNTABLE_MODELS = {
    video: Video,
    tweet: Tweet,
    livestream: LiveStream
}

const toggleLike = asyncHandler(async (req, res) => {
    const { contentId, contentType } = req.body

    const validTypes = ['comment', 'video', 'tweet', 'playlist', 'livestream']
    if (!validTypes.includes(contentType)) {
        throw new ApiError(400, "Invalid Content Type")
    }

    // Verify content exists
    let contentExists
    switch (contentType) {
        case 'video':     contentExists = await Video.findById(contentId);    break
        case 'playlist':  contentExists = await Playlist.findById(contentId); break
        case 'comment':   contentExists = await Comment.findById(contentId);  break
        case 'tweet':     contentExists = await Tweet.findById(contentId);    break
        case 'livestream':contentExists = await LiveStream.findById(contentId);break
    }
    if (!contentExists) throw new ApiError(404, `${contentType} not found`)

    const existingLike = await Like.findOne({
        user: req.user?._id,
        contentType,
        contentId
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)

        // Decrement denormalized counter if the model tracks it
        if (COUNTABLE_MODELS[contentType]) {
            await COUNTABLE_MODELS[contentType].findByIdAndUpdate(
                contentId,
                { $inc: { likes: -1 } }
            )
        }

        return res.status(200).json(
            new ApiResponse(200, { liked: false }, "Unliked successfully")
        )
    }

    await Like.create({
        user: req.user._id,
        contentType,
        contentId,
        reaction: 'like'
    })

    // Increment denormalized counter
    if (COUNTABLE_MODELS[contentType]) {
        await COUNTABLE_MODELS[contentType].findByIdAndUpdate(
            contentId,
            { $inc: { likes: 1 } }
        )
    }

    return res.status(201).json(
        new ApiResponse(201, { liked: true }, "Liked Successfully")
    )
})

const getLikes = asyncHandler(async (req, res) =>{
    const {contentId , contentType} = req.query
    const likesCount = await Like.countDocuments({
        contentType,
        contentId
    })
    return res.status(200).json(
        new ApiResponse(200, {likesCount }, "Likes count is retrieved successfully")
    )
})

const getUserLikes = asyncHandler(async (req, res)=>{
    const { page =1 ,limit = 1, contentType } = req.query

    const query = {user : req.user?._id}
    if(contentType){
        query.contentType = contentType
    }

    const likes  = await Like.find(query)
        .populate('contentId')
        .sort({createdAt : -1})
        .limit(limit * 1)
        .skip((page -1 ) * limit)
    return res.status(200).json(
        new ApiResponse(200, {likes} ,"User likes retrieved succesfully")
    )
})

const isLiked = asyncHandler(async (req, res)  => {
    const {contentId , contentType} = req.query
    const like = await Like.findOne({
        user : req.user._id,
        contentType : contentType,
        contentId : contentId
    })
    return res.status(200).json(
        new ApiResponse(200, {isLiked : !!like} , "Like status checked successfully")
    )
})

export {
    isLiked,
    getUserLikes,
    getLikes,
    toggleLike
}
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
// import { User } from "../models/user.models.js";
import { Playlist } from "../models/playlist.model.js";
import { Tweet } from "../models/tweet.model.js";

const addComment = asyncHandler(async (req , res ) =>{
    const { content , parentContentType , parentContentId} = req.body

    let parentExists
    switch(parentContentType){
        case 'video':
            parentExists = await Video.findById(parentContentId)
            break
        case 'playlist':
            parentExists = await Playlist.findById(parentContentId)
            break
        case 'comment' :
            parentExists= await Comment.findById(parentContentId)
            break
        case 'tweet' :
            parentExists= await Tweet.findById(parentContentId)
            break
    }
    if(!parentExists){
        throw new ApiError(404, `${parentContentType} not found`)
    }
    const comment = await Comment.create({
        content : content.trim(),
        parentContentType,
        parentContentId,
        user : req.user?._id
    })
    return res.status(201).json(
        new ApiResponse(201, comment , "Comment added successfully")
    )
})

const getComments = asyncHandler(async (req , res)=>{
    const {parentContentType , parentContentId , page=1 ,limit =10}= req.query 
    const comments = await Comment.find({
        parentContentId,
        parentContentType,
    })
    .populate('user', 'username fullname avatar')
    .sort({createdAt :-1})
    .limit(limit*1)
    .skip((page-1)*limit)

    const commentsWithStats  = await Promise.all(
        comments.map(async(comment) =>{
            const replyCount = await Comment.countDocuments({
                parentContentType :'comment',
                parentContentId : comment._id
            })
            return {...comment.toObject() , replyCount}
        })
    )
    const total = await Comment.countDocuments({
        parentContentType,
        parentContentId
    })
    return res.status(200).json(
        new ApiResponse(200, {
            comments:commentsWithStats,
            // commentsWithReplyCount,
            pagination :{
                page,
                limit,
                total,
                pages : Math.ceil(total/limit)
            }
        },"Comments Retrieved Successfully")
    )
})

const updateComment = asyncHandler(async (req , res )=>{
    const {commentId, content} = req.body
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404, "Comment not found ")
    }
    if(comment.user.toString() !== req.user._id.toString()){
        throw new ApiError(403, "Unauthorized Request to edit")
    }
    comment.content = content.trim()
    await comment.save()

    return res.status(200).json(
        new ApiResponse(200, comment ,"comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req , res )=>{
    const {commentId } = req.params
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404, "comment not found")
    }
    if(comment.user.toString()!== req.user._id.toString()){
        throw new ApiError(403, "Unauthorized Request to delete comment")
    }
    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(
        new ApiResponse(200 , {}, "Comment Deleted successfully")
    )
})

const getUserComments = asyncHandler(async (req , res )=>{
    const {parentContentType,page = 1, limit =10 } = req.query
    let q = {
        user : req.user?._id ,
    }
    if(parentContentType){
        q.parentContentType  = parentContentType
    }
    const comments = await Comment.find(q)
        .populate('user' , 'username fullname avatar')
        .sort({createdAt : -1})
        .limit(limit*1)
        .skip((page-1)*limit)
    
    const total = await Comment.countDocuments(q)
    return res.status(200).json(
        new ApiResponse(200,{
            comments,
            pagination:{
                page,
                limit,
                total,
                pages : Math.ceil(total/limit)
            }
        },"User comments retrieved successfully")
    )
})

export {
    getUserComments,
    deleteComment,
    updateComment,
    getComments,
    addComment
}
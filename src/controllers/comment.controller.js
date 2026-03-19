import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Playlist } from "../models/playlist.model.js";
import { Tweet } from "../models/tweet.model.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


const addComment = asyncHandler(async (req , res ) =>{
    const { content , parentContentId} = req.body
    
    const parentContentType = req.body.parentContentType
        ? req.body.parentContentType.charAt(0).toUpperCase() + req.body.parentContentType.slice(1).toLowerCase()
        : null

    if (!parentContentType) {
        throw new ApiError(400, "parentContentType is required")
    }
    if (!isValidObjectId(parentContentId)) {
    throw new ApiError(400, "Invalid parentContentId format");
    }
    let parentExists
    switch(parentContentType){
        case 'Video':
            parentExists = await Video.findById(parentContentId)
            break
        case 'Playlist':
            parentExists = await Playlist.findById(parentContentId)
            break
        case 'Comment':
            parentExists = await Comment.findById(parentContentId)
            break
        case 'Tweet':
            parentExists = await Tweet.findById(parentContentId)
            break
        case 'Livestream':
            const { LiveStream } = await import('../models/livestream.model.js')
            parentExists = await LiveStream.findById(parentContentId)
            break
        default:
            throw new ApiError(400, `Invalid parentContentType: ${parentContentType}`)
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

const getComments = asyncHandler(async (req, res) => {
    let { parentContentType, parentContentId, page = 1, limit = 10 } = req.query
    parentContentType = parentContentType
        ? parentContentType.charAt(0).toUpperCase() + parentContentType.slice(1).toLowerCase()
        : null

    const comments = await Comment.aggregate([
        { $match: { parentContentId: new mongoose.Types.ObjectId(parentContentId), parentContentType } },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * Number(limit) },
        { $limit: Number(limit) },
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
                pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }]
            }
        },
        { $unwind: { path: '$user', preserveNullAndEmpty: false } },
        {
            $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'parentContentId',
                as: 'replies',
                pipeline: [{ $match: { parentContentType: 'Comment' } }, { $count: 'count' }]
            }
        },
        {
            $addFields: {
                replyCount: { $ifNull: [{ $arrayElemAt: ['$replies.count', 0] }, 0] }
            }
        },
        { $project: { replies: 0 } }
    ])

    const total = await Comment.countDocuments({ parentContentId, parentContentType })

    return res.status(200).json(
        new ApiResponse(200, {
            comments,
            pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
        }, "Comments Retrieved Successfully")
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
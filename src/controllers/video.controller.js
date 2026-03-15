import { Video } from "../models/video.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from '../config/logger.js';
import { uploadOnS3, deleteFromS3ByKey } from "../utils/aws-s3.js";
import { generateThumbnail, getVideoDuration } from "../utils/thumbnailGenerator.js";
import fs from 'fs/promises';

const uploadVideo = asyncHandler(async(req,res)=>{
    const {title,description,visibility,tags,category} = req.body
    if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
    } 
    const VideoDescription  = description|| 'Video From StreamTime'
    const videoVisibility = visibility || 'public';
    const VideoCategory = category||'entertainment'
    
    const videoFile = req.files?.videoFile[0]?.path
    const fileSize = req.files?.videoFile[0]?.size;
    logger.debug('Video file path:', videoFile);
    logger.debug('Video file size:', (fileSize / 1024 / 1024).toFixed(2), "MB");
    // Add validation
    if (fileSize > 100 * 1024 * 1024) {
        throw new ApiError(413, "Video file too large. Maximum size is 100MB. Your file is " + (fileSize / 1024 / 1024).toFixed(2) + "MB");
    }
    const uploadedVideoResult = await uploadOnS3(videoFile, 'videos');
    if (!uploadedVideoResult || !uploadedVideoResult.url) {
        logger.error('S3 response:', uploadedVideoResult);
        throw new ApiError(500, "Failed to upload video");
    }
    logger.debug('S3 response:', uploadedVideoResult.url)
    let thumbnailUrl;
    const thumbnailFile = req.files?.thumbnail?.[0]?.path;

    if (thumbnailFile) {
        // User provided thumbnail
        logger.debug('Using user-provided thumbnail');
        const uploadedThumbnailResult = await uploadOnS3(thumbnailFile, 'thumbnails');
        thumbnailUrl = uploadedThumbnailResult.url;
    } else {
        // Generate thumbnail from video
        logger.debug('Generating thumbnail from video');
        try {
            const thumbnailPath = await generateThumbnail(videoFile);
            const uploadedThumbnailResult = await uploadOnS3(thumbnailPath, 'thumbnails');
            thumbnailUrl = uploadedThumbnailResult.url;
            
            // Clean up generated thumbnail
            await fs.unlink(thumbnailPath);
        } catch (error) {
            logger.error('Failed to generate thumbnail:', error);
            thumbnailUrl = ""; // Use empty thumbnail as fallback
        }
    }

    // Get video duration
    let duration = 0;
    try {
        duration = Math.round(await getVideoDuration(videoFile));
    } catch (error) {
        logger.error('Failed to get video duration:', error);
    }

    const video = await Video.create({
        videoURL : uploadedVideoResult.url,
        title,
        thumbnail:thumbnailUrl,
        description : VideoDescription,
        duration : duration,
        visibility: videoVisibility,
        tags:tags?.split(',').map(tag=> tag.trim()).filter(tag=>tag),
        category: VideoCategory,
        ownerName : req.user.fullname,
        ownerUsername : req.user.username,
        ownerAvatar : req.user.avatar,
        owner : req.user._id
    }) 
    return res.status(201).json(
        new ApiResponse(201,video,"Video uploaded successfully")
    )
})

const getAllVideos = asyncHandler(async (req,res)=>{
    const {page = 1,limit = 10, category ,tags} = req.query
    let query = { visibility :'public', isPublished : true};

    if(category){
        query.category = category
    }
    if(tags){
        query.tags = {$in : tags.split(',')};
    }
    const videos = await Video.find(query)
        .sort({createdAt: -1})
        .limit(limit*1)
        .skip((page-1)*limit);

    const total = await Video.countDocuments(query);

    return res.status(200)
    .json(
        new ApiResponse(200,
            {
                videos,
                pagination:{
                    page,
                    limit,
                    total,
                    pages:Math.ceil(total/limit)
                }
            },
            "Videos fetched successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) =>{
    const {videoId} = req.params
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    if(video.visibility==='private' && video.owner.toString() !==req.user?._id.toString()){
        throw new ApiError(403, "Access denied")
    }
    video.views +=1
    await video.save()
    return res.status(200).json(new ApiResponse(200,video,"Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res)=> {
    const {videoId} = req.params
    const {title , description, visibility , tags ,category} = req.body
    const video= await Video.findById(videoId)
    if(!video)throw new ApiError(404 , "video not found")
    if(video.owner.toString()!== req.user?._id.toString()){
        throw new ApiError(403, "Unauthorized access")
    }
    if(title)video.title = title
    if(description)video.description = description
    if(visibility)video.visibility = visibility
    if (tags) video.tags = tags.split(',').map(tag => tag.trim());
    if(category)video.category = category

    await video.save()
    return res.status(200).json(new ApiResponse(200, video, "Video Details Successfully updated "))
    
})


const deleteVideo = asyncHandler(async (req, res)=>{
    const {videoId} = req.params
    const video = await Video.findById(videoId)
    if(!video)throw new ApiError(404, "Video not found")
    if(video.owner.toString()!== req.user._id.toString())throw new ApiError(403, "Unauthorized Request")
    
    // Extract keys from URLs and delete from S3
    if(video.videoURL){
        const videoKey = video.videoURL.split('/').pop();
        await deleteFromS3ByKey(videoKey);
    }
    if(video.thumbnail){
        const thumbnailKey = video.thumbnail.split('/').pop();
        await deleteFromS3ByKey(thumbnailKey);
    }
    
    await Video.findByIdAndDelete(videoId)

    return res.status(200).json(
        new ApiResponse(200,{} , "Video deleted Successfully")
    )
})
const getUserVideos = asyncHandler(async ( req , res) =>{
    const {page =1, limit =10 } = req.query
    const videos = await Video.find({owner: req.user?._id})
    .sort({createdAt :-1})
    .limit(limit * 1)
    .skip((page-1)*limit)

    const total = await Video.countDocuments({owner : req.user?._id})
    return res.status(200).json(
        new ApiResponse(200,{videos,
        pagination:{
            page,
            limit,
            total,
            pages : Math.ceil(total/limit)
        }},"user videos fetched successfully"))
})

const searchVideos = asyncHandler(async (req,res) =>{
    const { q , page =1 , limit = 10 , category , tags} = req.query
    let query = {
        visibility : 'public',
        isPublished : true
    }
    if(q){
        query.$or = [
            {title :{ $regex : q, $options : 'i'}},
            {description : { $regex : q , $options : 'i'}},
            {tags : {$in : [ new RegExp(q,'i')]}},
            {ownerName : {$regex : q , $options :'i'}},
            {ownerUsername : {$regex : q , $options : 'i'}}
        ]
    }
    if(category){
        query.category = category
    }
    if(tags){
        query.tags = {$in : tags.split(',')}
    }
    const videos = await Video.find(query)
        .sort({createdAt : -1})
        .limit(limit*1)
        .skip((page-1)*limit)

    const total = await Video.countDocuments(query)

    return res.status(200).json(
        new ApiResponse(200,
            {
                videos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages : Math.ceil(total/limit)
                }
            },
            "Videos found Successfully"
        )
    )
})


export {
    uploadVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    getUserVideos,
    searchVideos
};
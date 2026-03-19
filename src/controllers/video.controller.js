import { Video } from "../models/video.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from '../config/logger.js';
import { uploadOnS3, deleteFromS3ByKey } from "../utils/aws-s3.js";
import { generateThumbnail, getVideoDuration } from "../utils/thumbnailGenerator.js";
import fs from 'fs/promises';
// import { addToWatchHistory } from "./user.controller.js"
import { Subscription } from "../models/subscriptions.models.js";
import { addToWatchHistory } from "../utils/watchHistory.js"
import { VideoAnalytics } from "../models/videoAnalytics.models.js";
const uploadVideo = asyncHandler(async(req,res)=>{
    const {title,description,visibility,tags,category} = req.body;
    if (!title?.trim()) {
        throw new ApiError(400, "Title is required");
    } 
    
    const videoFile = req.files?.videoFile[0]?.path;
    const thumbnailFile = req.files?.thumbnail?.[0]?.path;
    const fileSize = req.files?.videoFile[0]?.size;

    // 1. Check file sizes
    if (fileSize > 200 * 1024 * 1024) {
        if (videoFile) await fs.unlink(videoFile).catch(() => {});
        if (thumbnailFile) await fs.unlink(thumbnailFile).catch(() => {});
        throw new ApiError(413, "Video file too large. Maximum size is 100MB.");
    }

    // ✅ 2. Extract Duration BEFORE uploading (while local file still exists)
    let duration = 0;
    try {
        duration = Math.round(await getVideoDuration(videoFile));
    } catch (error) {
        logger.error('Failed to get video duration:', error);
    }

    // ✅ 3. Generate Thumbnail BEFORE uploading (while local file still exists)
    let finalThumbnailPath = thumbnailFile;
    let generatedThumbnailPath = null;

    if (!finalThumbnailPath) {
        try {
            generatedThumbnailPath = await generateThumbnail(videoFile);
            finalThumbnailPath = generatedThumbnailPath;
        } catch (error) {
            logger.error('Failed to generate thumbnail:', error);
            throw new ApiError(500, "Failed to process video thumbnail");
        }
    }

    // ✅ 4. NOW upload the video to S3 (This deletes the local video file)
    const uploadedVideoResult = await uploadOnS3(videoFile, 'videos');
    if (!uploadedVideoResult || !uploadedVideoResult.url) {
        // Clean up the generated thumbnail if video upload fails
        if (generatedThumbnailPath) await fs.unlink(generatedThumbnailPath).catch(() => {});
        throw new ApiError(500, "Failed to upload video");
    }

    // ✅ 5. Upload the Thumbnail to S3 (This deletes the local thumbnail file)
    let thumbnailUrl = "";
    if (finalThumbnailPath) {
        const uploadedThumbnailResult = await uploadOnS3(finalThumbnailPath, 'thumbnails');
        thumbnailUrl = uploadedThumbnailResult?.url || "";
    }

    // 6. Save to Database
    const video = await Video.create({
        videoURL : uploadedVideoResult.url,
        title,
        thumbnail: thumbnailUrl,
        description : description || 'Video From StreamTime',
        duration : duration,
        visibility: visibility || 'public',
        tags: tags?.split(',').map(tag=> tag.trim()).filter(tag=>tag),
        category: category || 'entertainment',
        ownerName : req.user.fullname,
        ownerUsername : req.user.username,
        ownerAvatar : req.user.avatar,
        owner : req.user._id
    });

    await VideoAnalytics.create({ video: video._id }).catch(() => {});
    return res.status(201).json(new ApiResponse(201, video, "Video uploaded successfully"));
});
const getAllVideos = asyncHandler(async (req,res)=>{
    const {page = 1,limit = 10, category ,tags, feed} = req.query;
    let query = { visibility :'public', isPublished : true};
    if (feed === 'subscribed' && req.user) {
        const subscriptions = await Subscription.find({ subscriber: req.user._id });
        const subscribedChannelIds = subscriptions.map(sub => sub.channel);
        query.owner = { $in: subscribedChannelIds };
    }
    if(category){
        query.category = category
    }
    if(tags){
        query.tags = {$in : tags.split(',')};
    }
    const videos = await Video.find(query)
        .sort({createdAt: -1})
        .limit(limit*1)
        .skip((page-1)*limit)
        .lean()

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
    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true }
    );
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    if(video.visibility==='private' && video.owner.toString() !==req.user?._id.toString()){
        throw new ApiError(403, "Access denied")
    }
    if (req.user?._id) {
        await addToWatchHistory(req.user._id, videoId)
    }
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
        const videoKey = new URL(video.videoURL).pathname.substring(1)
        await deleteFromS3ByKey(videoKey)
    }
    if(video.thumbnail){
        // const thumbnailKey = video.thumbnail.split('/').pop();
        const thumbnailKey = new URL(video.thumbnail).pathname.substring(1)
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
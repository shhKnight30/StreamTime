import { Video } from "../models/video.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {v2 as cloudinary} from "cloudinary"

const generateThumbnailFromVideo  = async(videoUrl) =>{
    try{
        const publicId = videoUrl.split('/').pop().split('.')[0]
        const thumbnailUrl = await cloudinary.url(publicId,{
            resource_type: "video",
            format: "jpg",
            start_offset : 0,
            transformation:[
                { width:1280, height:720, crop:"fill"},
                { quality : "auto" }
            ]
        })
        return thumbnailUrl
    }catch(err){
        throw new ApiError(500,"Failed to generate thumbnail")
    }
}
const uploadVideo = asyncHandler(async(req,res)=>{
    const {title,description,visibility,tags,category} = req.body
    if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
    } 
    const VideoDescription  = description|| 'Video From StreamTime'
    const videoVisibility = visibility || 'public';
    const VideoCategory = category||'Entertainment'
    
    const videoFile = req.files?.videoFile[0]?.path
    const fileSize = req.files?.videoFile[0]?.size;
    console.log("Video file path:", videoFile);
    console.log("Video file size:", (fileSize / 1024 / 1024).toFixed(2), "MB");
    // Add validation
    if (fileSize > 10 * 1024 * 1024) {
        throw new ApiError(413, "Video file too large. Maximum size is 10MB. Your file is " + (fileSize / 1024 / 1024).toFixed(2) + "MB");
    }
    const uploadedVideo = await uploadOnCloudinary(videoFile);
    if (!uploadedVideo || !uploadedVideo.secure_url) {
        console.log("Cloudinary response:", uploadedVideo)
        throw new ApiError(500, "Failed to upload video");
    }
    console.log("Cloudinary response:", uploadedVideo.secure_url)
    let thumbnailUrl;
    const thumbnailFile = req.files?.thumbnail?.[0]?.path;

    if (thumbnailFile) {
        // User provided thumbnail
        console.log("Using user-provided thumbnail");
        const uploadedThumbnail = await uploadOnCloudinary(thumbnailFile);
        thumbnailUrl = uploadedThumbnail.secure_url;
    } else {
        // Generate thumbnail from uploaded video
        console.log("Generating thumbnail from video");
        thumbnailUrl = await generateThumbnailFromVideo(uploadedVideo.secure_url);
    }

    if(!thumbnailUrl){
        throw new ApiError(500,"Failed to process thumbnail")
    }

    const video = await Video.create({
        videoURL : uploadedVideo.secure_url,
        title,
        thumbnail:thumbnailUrl,
        description : VideoDescription,
        duration : uploadedVideo.duration || 0,
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
    // await Video(findByIdAndDelete(videoId))
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
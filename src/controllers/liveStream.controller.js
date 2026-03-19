import {LiveStream} from '../models/livestream.model.js'
import { v4 as uuidv4} from 'uuid'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import websocketServices from '../services/websocket.service.js'
// import webrtcService from '../services/webrtc.service.js'
import mediasoupService from '../services/mediasoup.service.js'
import recordingService from '../services/recording.service.js'
const createLiveStream = asyncHandler(async (req , res) =>{
    const {title , description , category = 'other' , tags=[], visibility= 'public'} = req.body

    const roomId = uuidv4()

    const liveStream = await LiveStream.create({
        title : title.trim(),
        description : description?.trim(),
        streamer : req.user?._id,
        roomId,
        category ,
        tags,
        visibility
    })

    return res.status(201).json(
        new ApiResponse(201,
            {stream : liveStream,
            roomId : liveStream.roomId},
            "Live Stream created successfully"
        )
    )
})

const getLiveStreams = asyncHandler(async (req,res) =>{
    const { page =1 , limit=10,category}= req.query
     let query = {isLive:true}
     if( category && category!=='all'){
        query.category = category
     }
     const streams = await LiveStream.find(query)
     .populate('streamer','username fullname avatar')
     .sort({viewers :-1})
     .limit(limit*1)
     .skip((page-1)*limit)

     const total = await LiveStream.countDocuments(query)

     return res.status(200).json(
        new ApiResponse(200,
            {
                streams,
                pagination:{
                    page,
                    limit,
                    total ,
                    pages:Math.ceil(total/limit)
                }
            },
            "Live stream retrieved successfully"
        )
     )
})

const getLiveStreamById = asyncHandler(async (req, res)=>{
    const {streamId} = req.params
    const stream = await LiveStream.findById(streamId)
    .populate('streamer' ,'username fullname avatar')
    
    if(!stream){
        throw new ApiError(404,"Live Stream not found")
    }
    return res.status(200).json(
        new ApiResponse(200,stream,"Live Stream retrieved successfully")
    )
})

const updateLiveStream = asyncHandler(async (req, res)=>{
    const {streamId} = req.params
    const {title , description , category , tags ,visibility } = req.body
    const stream = await LiveStream.findById(streamId)
    if(!stream){
        throw new ApiError(404, "Live Stream not found ")
    }
    if(stream.streamer.toString() !== req.user._id.toString()){
        throw new ApiError(403, "unauthorized request | cannot update other user's stream")
    }
    if(title)stream.title = title.trim()
    if(description)stream.description = description.trim()
    if(category) stream.category = category
    if(tags) stream.tags= tags
    if(visibility)  stream.visibility = visibility
    await stream.save()
    return res.status(200).json(
        new ApiResponse(200,
            stream,
            "Live Stream updated successfully"
        )
    )
})

const deleteLiveStream = asyncHandler(async (req, res) =>{
    const streamId = req.params.streamId
    const stream = await LiveStream.findById(streamId)
    if (!stream) {
        throw new ApiError(404, "Live stream not found");
    }
    
    if (stream.streamer.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Cannot delete other user's stream");
    }
    await LiveStream.findByIdAndDelete(streamId)
    return res.status(200).json(
        new ApiResponse(200,{},"LiveStream Deleted Successfully")
    )
})

const startLiveStream = asyncHandler(async (req, res) =>{
    const {streamId} = req.params
    const stream = await LiveStream.findById(streamId)

    if (!stream) {
        throw new ApiError(404, "Live stream not found");
    }
    
    if (stream.streamer.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Cannot start other user's stream");
    }
    stream.isLive=true
    stream.startTime = new Date()
    stream.viewers = 0
    await stream.save()

    websocketServices.broadcastToStream(stream.roomId,'stream-started',{
        streamId:stream._id,
        title:stream.title
    })
    return res.status(200).json(
        new ApiResponse(200,stream,"Live Stream has started successfully")
    )
})

const stopLiveStream = asyncHandler(async (req, res) => {
    const { streamId } = req.params;
    const stream = await LiveStream.findById(streamId);
    if (!stream) throw new ApiError(404, "Live stream not found");
    if (stream.streamer.toString() !== req.user._id.toString())
        throw new ApiError(403, "Cannot stop other user's stream");

    stream.isLive = false;
    stream.endTime = new Date();
    if (stream.startTime) {
        stream.duration = Math.floor((stream.endTime - stream.startTime) / 1000);
    }
    await stream.save();

    // ← ADD THESE
    recordingService.stopRecording(`stream_${stream._id}`);
    await mediasoupService.cleanupStream(`stream_${stream._id}`);

    websocketServices.broadcastToStream(stream.roomId, 'stream-stopped', {
        streamId: stream._id,
        duration: stream.duration
    });

    return res.status(200).json(new ApiResponse(200, stream, "Live stream stopped successfully"));
});
// ===== WEBRTC SPECIFIC CONTROLLERS =====

/**
 * Start WebRTC streaming for a live stream
 * Initializes WebRTC peer connection and media stream
 */
const startWebRTCStream = asyncHandler(async (req, res) => {
    const { streamId } = req.params
    
    // Verify stream exists and user owns it
    const stream = await LiveStream.findById(streamId)
    if (!stream) {
        throw new ApiError(404, "Live stream not found")
    }
    
    if (stream.streamer.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Cannot start other user's WebRTC stream")
    }

    // Check if WebRTC is already active for this stream
    const existingStreamInfo = websocketServices.getStreamInfo(streamId)
    if (existingStreamInfo && existingStreamInfo.isActive) {
        throw new ApiError(400, "WebRTC stream is already active for this stream")
    }

    // Update stream status
    stream.isLive = true
    stream.startTime = new Date()
    stream.viewers = 0
    stream.isWebRTCActive = true
    await stream.save()

    return res.status(200).json(
        new ApiResponse(200, {
            streamId: stream._id,
            roomId: stream.roomId,
            title: stream.title,
            isWebRTCActive: true,
            message: "WebRTC stream initialized. Ready to start broadcasting."
        }, "WebRTC stream started successfully")
    )
})

/**
 * Stop WebRTC streaming for a live stream
 * Cleans up WebRTC connections and updates stream status
 */
const stopWebRTCStream = asyncHandler(async (req, res) => {
    const { streamId } = req.params
    
    // Verify stream exists and user owns it
    const stream = await LiveStream.findById(streamId)
    if (!stream) {
        throw new ApiError(404, "Live stream not found")
    }
    
    if (stream.streamer.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Cannot stop other user's WebRTC stream")
    }

    // Update stream status
    stream.isLive = false
    stream.endTime = new Date()
    stream.isWebRTCActive = false
    
    if (stream.startTime) {
        stream.duration = Math.floor((stream.endTime - stream.startTime) / 1000)
    }
    
    await stream.save()

    // Cleanup WebRTC connections
    // webrtcService.cleanupStream(streamId)
    await mediasoupService.cleanupStream(streamId)
    // Notify all connected clients
    websocketServices.broadcastToStream(stream.roomId, 'webrtc-stream-ended', {
        streamId: stream._id,
        message: "WebRTC stream has ended",
        duration: stream.duration
    })

    return res.status(200).json(
        new ApiResponse(200, {
            streamId: stream._id,
            duration: stream.duration,
            message: "WebRTC stream stopped successfully"
        }, "WebRTC stream stopped successfully")
    )
})

/**
 * Get WebRTC stream information
 * Returns stream details and connection statistics
 */
const getWebRTCStreamInfo = asyncHandler(async (req, res) => {
    const { streamId } = req.params
    
    // Verify stream exists
    const stream = await LiveStream.findById(streamId)
    .populate('streamer', 'username fullname avatar')
    
    if (!stream) {
        throw new ApiError(404, "Live stream not found")
    }

    // Get WebRTC statistics
    const webRTCStats = { streamId, activeConnections: 0 }
    const viewerCount = websocketServices.getViewerCount(streamId)
    const streamInfo = websocketServices.getStreamInfo(streamId)

    return res.status(200).json(
        new ApiResponse(200, {
            stream: {
                _id: stream._id,
                title: stream.title,
                description: stream.description,
                category: stream.category,
                tags: stream.tags,
                visibility: stream.visibility,
                streamer: stream.streamer,
                roomId: stream.roomId,
                isLive: stream.isLive,
                isWebRTCActive: stream.isWebRTCActive,
                startTime: stream.startTime,
                viewers: stream.viewers,
                duration: stream.duration
            },
            webRTC: {
                ...webRTCStats,
                currentViewers: viewerCount,
                isActive: streamInfo?.isActive || false
            }
        }, "WebRTC stream information retrieved successfully")
    )
})

/**
 * Get all active WebRTC streams
 * Returns list of streams with WebRTC enabled
 */
const getActiveWebRTCStreams = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, category } = req.query
    
    // Build query for active WebRTC streams
    let query = { 
        isLive: true, 
        isWebRTCActive: true 
    }
    
    if (category && category !== 'all') {
        query.category = category
    }

    const streams = await LiveStream.find(query)
        .populate('streamer', 'username fullname avatar')
        .sort({ viewers: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

    const total = await LiveStream.countDocuments(query)

    // Get WebRTC statistics for each stream
    const streamsWithStats = await Promise.all(streams.map(async (stream) => {
        // const webRTCStats = webrtcService.getStreamStats(stream._id.toString())
        const viewerCount = websocketServices.getViewerCount(stream._id.toString())
        
        return {
            ...stream.toObject(),
            webRTC: {
                streamId: stream._id,
                activeConnections: 0,
                currentViewers: viewerCount
            }
        }
    }))

    return res.status(200).json(
        new ApiResponse(200, {
            streams: streamsWithStats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, "Active WebRTC streams retrieved successfully")
    )
})

/**
 * Get WebRTC connection statistics
 * Returns detailed statistics for all active streams
 */
const getWebRTCStats = asyncHandler(async (req, res) => {
    const activeStreams = websocketServices.getActiveStreams()

    return res.status(200).json(
        new ApiResponse(200, {
            totalActiveStreams: activeStreams.length,
            activeStreams
        }, "WebRTC statistics retrieved successfully")
    )
})

export {
    createLiveStream,
    getLiveStreamById,
    getLiveStreams,
    updateLiveStream,
    deleteLiveStream,
    startLiveStream,
    stopLiveStream,
    // WebRTC specific controllers
    startWebRTCStream,
    stopWebRTCStream,
    getWebRTCStreamInfo,
    getActiveWebRTCStreams,
    getWebRTCStats
}
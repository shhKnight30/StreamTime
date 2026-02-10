import {LiveStream} from '../models/livestream.model.js'
import { v4 as uuidv4} from 'uuid'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import websocketServices from '../services/websocket.services.js'

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
    const streams = await LiveStream.findById(streamId)
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
    if(categroy) stream.category = category
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
    const streamId = req.params 
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

const stopLiveStream = asyncHandler(async (req, res)=>{
    const {streamId} = req.params
    const stream= await LiveStream.findById(streamId)
    if(!stream) {
        throw new ApiError(404, "Live stream not found")
    }
       if (stream.streamer.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Cannot stop other user's stream");
    }
    stream.isLive= false
    stream.endTime = new Date()
    if(stream.startTime){
        stream.duration = Math.floor((stream.endTime-stream.startTime)/1000)
    }
    await stream.save()
    websocketServices.broadcastToStream(stream.streamId,'stream-stopped',{
        streamId:stream._id,
        duration : stream.duration
    })

    return res.status(200).json(
        new ApiResponse(200,stream,"Live stream stopped successfully")
    )
})

export {
    createLiveStream,
    getLiveStreamById,
    getLiveStreams,
    updateLiveStream,
    deleteLiveStream,
    startLiveStream,
    stopLiveStream
}
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createPlaylist = asyncHandler(async (req , res ) =>{
    const {name , description , visibility} = req.body
    if(!name?.trim()) {
        throw new ApiError(400, "Playlist new is required")
    }
    const playlist = await Playlist.create({
        name: name.trim(),
        description : description?.trim() || "",
        owner : req.user?._id,
        isPublic : isPublic || false

    })
    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    )
})

const getAllPlaylists = asyncHandler(async (req, res)=>{
    const {page = 1,limit = 10,q, category} = req.query
    let query = {visibility : 'public'}
    if(q){
        query.$or = [
            {name : { $regex: q , $options:'i'}},
            {description : { $regex : q , $options : 'i'}},
            {'owner.username' : {$regex : q , $options : 'i'}},
            {'owner.fullname' : {$regex :q ,$options : 'i'}}   
        ]
    }
    if(category){
        query.category = category
    }
    const playlists = await Playlist.find(query)
    .populate('owner', 'username fullname avatar')
    .populate('Videos', 'title thumbnail duration')
    .sort({createdAt :-1})
    .limit(limit *1)
    .skip((page -1)*limit)

    const total = await Playlist.countDocuments(query)

    return res.status(200).json(
        new ApiResponse(200, { 
            playlists ,
            pagiination :{
                page,
                limit,
                total ,
                pages : Math.ceil(total/limit)
            }
        },"All playlists retrieved successfully")
    )

})
const getUserPlaylists = asyncHandler( async (req,res) =>{
    const {page =1 , limit = 10 } = req.query 
    const playlists = await Playlist.find({owner : req.user._id})
    .populate('videos' , 'title thumbnail duration')
    .sort({createdAt: -1})
    .limit(limit*1)
    .skip((page-1)*limit)

    const total = await Playlist.countDocuments({owner : req.user._id})

    return res.status(200).json(
        new ApiResponse(200,
            {
                playlists,
                pagination : {
                    page,
                    limit,
                    total,
                    pages : Math.ceil(total/limit)
                }
            },"User playlists retrieved successfully"
        )
    )

})

const addVideoToPlaylist = asyncHandler(async (req, res) =>{
    const {playlistId , videoId} = req.body
    if(!playlistId || !videoId){
        throw new ApiError(400, "Playlist ID and Video ID are required")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist) throw new ApiError(404 , "Playlist not found ")
        
    if(playlist.owner.toString()!== req.user?._id.toString()) throw new ApiError(403, "Unauthorized Request")
    
    const video = await Video.findById(videoId)
    if(!video) throw new ApiError(404 , "Video not found ")
    if(playlist.videos.includes(videoId)) throw new ApiError(400, "Video already in playlist")
    playlist.videos.push(video)
    if(!playlist.thumbnail && video.thumbnail){
        playlist.thumbnail = video.thumbnail
    }
    const updatedPlaylist = await playlist.save()

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video added to Playlist")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res)=>{
    const {playlistId, videoId} = req.body
    if(!playlistId || !videoId){
        throw new ApiError(400, "Playlist ID and video ID are required")
    }
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "No Playlist found")
    }
    if(playlist.owner.toString()!== req.user?._id.toString()){
        throw new ApiError(400, "Unauthorized Request")
    }
    playlist.videos = playlist.videos.filter(video => video.toString()!==videoId)
    if(playlist.thumbnail && playlist.videos.length >0 ){
        const fVideo = await Video.findById(playlist.videos[0])
        playlist.thumbnail = fVideo?.thumbnail
    } else if(playlist.videos.length === 0){
        playlist.thumbnail= ""
    }
    const updatedPlaylist = await playlist.save()

    return res.status(200).json(
        new ApiResponse(200 , updatedPlaylist , "Video removed from playlist successfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res)=>{
    const {playlistId} = req.params

    if(!playlistId)throw new ApiError(400, " ID is required ")
    
    const playlist = await Playlist.findById(playlistId)
        .populate('owner', "username fullname avatar")
        .populate('Videos', "title thumbnail duration views owner ownerName ownerUsername")

    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }
    if(playlist.visibility !== 'public' && playlist.owner._id.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "Unauthorized Request")
    }
    return res.status(200).json(
        new ApiResponse(200, playlist, "playlist retrieved successfully")
    )    
})

const updatePlaylist = asyncHandler(async (req, res)=>{
    const {playlistId} = req.params
    const {name , description, visibility } = req.body
    
    const playlist= await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }
    if(playlist.owner.toString()!== req.user?._id){
        throw new ApiError(403, "Unauthorized Request")
    }
    if(name)playlist.name = name.trim()
    if(description!== undefined) playlist.description = description.trim()
    if(visibility)playlist.visibility = visibility|| 'public'
    const updatedPlaylist= await playlist.save()
    
    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist , "Playlist updated successfully")
    )
}) 

const deletePlaylist= asyncHandler(async (req, res)=>{
    const {playlistId} = req.params
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "PlayList not found")
    }
    if(playlist.owner.toString() !== req.user?._id){
        throw new ApiError(403, "Unauthorized Request")
    }
    await Playlist.findByIdAndDelete(playlistId)
    return res.status(200).json(
        new ApiResponse(200, {} , "Playlist deleted successfully")
    )
})

export {
    createPlaylist,
    getAllPlaylists,
    getUserPlaylists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist
}
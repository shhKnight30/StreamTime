import { addVideoToPlaylist, createPlaylist, deletePlaylist, getAllPlaylists, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { Router } from "express";

const router = Router()

router.route('/create').post(verifyJWT, createPlaylist)
router.route('/all').get(getAllPlaylists)
router.route('/u').get(verifyJWT,getUserPlaylists)
router.route('/add-video').post(verifyJWT,addVideoToPlaylist)
router.route('/remove-video').post(verifyJWT,removeVideoFromPlaylist)
router.route('/:playlistId').get(getPlaylistById)
router.route('/:playlistId').patch(verifyJWT,updatePlaylist)
router.route('/:playlistId').delete(verifyJWT,deletePlaylist)

export default router




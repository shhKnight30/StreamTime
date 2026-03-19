import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from '../config/logger.js';
import {User} from "../models/user.models.js"
import jwt from 'jsonwebtoken';
export const verifyJWT = asyncHandler(async(req , _ , next)=>{
    try{
        const token = req.cookies?.accessToken|| req.header("Authorization")?.replace("Bearer ", "")

        logger.debug('Token for verification:', token);
        if(!token){
            throw new ApiError(401,"unauthorized request")
        }
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -accessToken")
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }    
        req.user = user
        next()

    }catch(error){
        throw new ApiError(401,error?.message || "invalid access token")
    }

})
export const optionalAuth = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken 
            || req.header("Authorization")?.replace("Bearer ", "");
        
        if (token) {
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            req.user = await User.findById(decodedToken?._id)
                .select("-password -accessToken")
                .lean();
        }
    } catch (_) {
        // Token invalid or expired — treat as unauthenticated
        req.user = null;
    }
    next();
});
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import { uploadOnS3 } from '../utils/aws-s3.js'
import jwt from "jsonwebtoken"
import logger from '../config/logger.js';
// import  "../models/video.models.js";
// import "../models/subscriptions.models.js";
import { Video } from "../models/video.models.js";
// import { addToWatchHistory } from "../utils/watchHistory.js"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to S3, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const { fullname, email, password, username } = req.body
    if ([fullname, email, password, username].some((field) => (field?.trim() === ""))) {
        throw new ApiError(400, "all fields are required")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }
    // if({username}){
    //     username = username.toLowerCase()
    // }
    const avatarLocalPath = req.files?.avatar[0]?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }
    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    logger.debug('Avatar local path:', avatarLocalPath);
    const avatarResult = await uploadOnS3(avatarLocalPath, 'avatars')
    const coverImageResult = await uploadOnS3(coverImageLocalPath, 'covers')
    logger.debug('Avatar uploaded:', avatarResult);
    if (!avatarResult) {
        logger.error('Avatar file is required');
        throw new ApiError(400, "avatar file is required")
    }
    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        password,
        avatar: avatarResult.url,
        coverImage: coverImageResult?.url || "",
        email,
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering the user")
    }

    const { accessToken,refreshToken } = await generateAccessAndRefreshTokens(user._id)
    logger.debug('Request keys:', Object.keys(req));
    logger.debug('Request body:', req.body);
    logger.debug('Request file:', req.file);
    logger.debug('Request files:', req.files);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https'
    || process.env.FORCE_SECURE_COOKIES === 'true'

    const options = {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
    return res.status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, { user: createdUser, accessToken }, "user registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // get data from user
    // check username and mail esists
    // find the user
    // check crrect password\
    // if correct generate access token or refresh token 
    // send them in secure cookie
    
// 
    const { email, password } = req.body
    if (!email) {
    throw new ApiError(400, "Email is required");
}
if (!password) {
    throw new ApiError(400, "Password is required");
}

    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "user does not exist")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "invalid user credentials")
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //  FIXED — detect HTTPS from the request itself, or use an env flag
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' 
               || process.env.FORCE_SECURE_COOKIES === 'true'

    const options = {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
        user: loggedInUser,
        accessToken   // ← refreshToken intentionally omitted from body
    }, "user logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        {
            new: true,
        }
    )
        // ✅ FIXED — detect HTTPS from the request itself, or use an env flag
const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' 
               || process.env.FORCE_SECURE_COOKIES === 'true'

const options = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "user logged out successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used ")


        }
       // ✅ FIXED — detect HTTPS from the request itself, or use an env flag
const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' 
               || process.env.FORCE_SECURE_COOKIES === 'true'

const options = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
}
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken
                        , refreshToken: newRefreshToken
                    }
                    , "access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "all fields are required")
    }

    const user = await User.findById(req.user?._id)
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "invalid old password")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200
            , {}
            , "password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, username, email } = req.body
    if (!fullname && !username && !email) {
        throw new ApiError(400, "all fields required")
    }
    if (username) {
        const taken = await User.findOne({
            username: username.toLowerCase(),
            _id: { $ne: req.user._id }
        })
        if (taken) throw new ApiError(409, "username is already taken")
    }

    const updateFields = {}
    if (fullname) updateFields.fullname = fullname
    if (email) updateFields.email = email
    if (username) updateFields.username = username.toLowerCase()

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true }
    ).select("-password")


    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "account details updated successfully"
        ))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }
    const avatarResult = await uploadOnS3(avatarLocalPath, 'avatars')

    if (!avatarResult) {
        throw new ApiError(400, "Error while uploading avatar file")
    }
    
    // 1. Update the User profile
    // logger.log(avatarResult)
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { avatar: avatarResult.url }
        },
        {
            new: true
        }
    ).select("-password")

    // 2. ✅ Update all old videos with the new avatarURL
    await Video.updateMany(
        { owner: req.user._id },
        { $set: { ownerAvatar: avatarResult.url } } // Uses avatarResult.url
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
        )
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "cover image not found")
    }
    const coverImageResult = await uploadOnS3(coverImageLocalPath, 'covers')
    if (!coverImageResult) {
        throw new ApiError(400, "error while uploading cover image file")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { coverImage: coverImageResult.url }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image uploaded successfully")
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channle does not exists")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "user channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 ,before} = req.query
    const skip = (page - 1) * limit

    const user = await User.findById(req.user._id).select('watchHistory')
    if (!user) throw new ApiError(404, "User not found")
        
        const total = user.watchHistory.length
        
        let ids = user.watchHistory;
        if (before) {
            const idx = ids.findIndex(id => id.toString() === before);
            if (idx !== -1) ids = ids.slice(idx + 1);
        }
    // Slice the watchHistory array first, then populate
    const slicedIds = user.watchHistory
        .slice(skip, skip + Number(limit))

    const videos = await Video.find({ _id: { $in: slicedIds } })
        .select("title thumbnail duration views ownerName ownerUsername ownerAvatar createdAt")
        .lean()

    // Restore original order (find() doesn't preserve order)
    const orderedVideos = slicedIds
        .map(id => videos.find(v => v._id.toString() === id.toString()))
        .filter(Boolean)

    return res.status(200).json(
        new ApiResponse(200, {
            videos: orderedVideos,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }, "Watch history retrieved successfully")
    )
})



const clearWatchHistory = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $set: { watchHistory: [] } })
    return res.status(200).json(new ApiResponse(200, {}, "Watch history cleared successfully"))
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    clearWatchHistory
}
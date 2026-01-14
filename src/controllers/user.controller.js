import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from '../utils/ApiResponse.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import jwt from "jsonwebtoken"


  
const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false}) 
        return {accessToken,refreshToken}       
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async(req,res) =>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const {fullname,email,password,username} = req.body
    if([fullname,email,password,username].some((field) => (field?.trim()===""))){
        throw new ApiError(400,"all fields are required")
    }
    const existedUser  = await User.findOne({
        $or : [{username},{email}]
    })
    
    if(existedUser){
        throw new ApiError(409,"user with email or username already exists")    
    }
    // if({username}){
    //     username = username.toLowerCase()
    // }
    const avatarLocalPath = req.files?.avatar[0]?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }
    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) &&req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }
    console.log(avatarLocalPath)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // console.log("India")
    console.log(avatar)
    if(!avatar){
        console.log("not uploading on cloudinry")
        throw new ApiError(400,"avatar file is required")
    }
    // console.log(username)
    const user = await User.create({
        username,
        fullname,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || "" ,
        username,
        email,
    })
    // console.log(user)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    } 
    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)
    console.log("Request keys:", Object.keys(req));
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    console.log("req.files:", req.files); 
    return res.status(201).json(
        new ApiResponse(200,{user: createdUser,accessToken,refreshToken},"user registered successfully")
    )
})

const loginUser = asyncHandler(async(req,res)=>{
    // get data from user
    // check username and mail esists
    // find the user
    // check crrect password\
    // if correct generate access token or refresh token 
    // send them in secure cookie
    // console.log(req.body)
    const body = async ()=>{
        return req.body
    }

    const {email , password} = await body()
    // console.log(email)
    if(!email){
        throw new ApiError(400,"missingemail");
    }
    
    const user = await User.findOne({email})
    if(!user){
        throw new ApiError(404,"user does not exist")
    }
    // console.log(password)
    // console.log(user.password)
    // console.log(password === user.password)
    const isPasswordValid = await user.isPasswordCorrect(password)
    // console.log(isPasswordValid)
    if(!isPasswordValid){
        throw new ApiError(401,"invalid user credentials")
    }
    const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure:true,
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(
        200,
        {
            
            user:loggedInUser,accessToken , refreshToken
        },
        "user logged in successfully"
    ))
})

const logoutUser = asyncHandler(async(req,res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken : undefined,
            }

        },
        {
            new :true,
        }
    )
    const  options =  {
        httpOnly:true,
        secure :true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"user logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        } 
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used ")
          
            
        }
        const options = {
            httpOnly : true,
            secure: true
        }
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken
                ,refreshToken:newRefreshToken}
                ,"access token refreshed"
            )
        )
    }catch(error){
        throw new ApiError(401,error?.message || "Invalid Refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body
    if(!oldPassword || !newPassword){
        throw new ApiError(400,"all fields are required")
    }
    
    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return  res
    .status(200)
    .json(new ApiResponse(200
        ,{}
    ,"password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,username,email} = req.body
    if(!fullname && !username&& !email){
        throw new ApiError(400,"all fields required")
    }
    const user= await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email,
                username
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "account details updated successfully"
    ))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar file")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{avatar:avatar.url}
        },
        {
            new:true
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar image updated successfully")
    )
})
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"cover image not found")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage){
        throw new ApiError(400,"error while uploading cover image file")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{coverImage:coverImage.url}
        },
        {
            new :true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image uploaded successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscription",
                localField: "_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelSubscribedToCount :{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond : {
                        if :{$in:[req.user._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channle does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"user channel fetched successfully")
    )
})
export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}
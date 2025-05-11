import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from '../utils/ApiResponse.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
// const registerUser = asyncHandler(async(req,res )=>{
//     // res.status(200).json({
//     //     message:"nareshbhai jinda nahi murdabad",
//     // })
      

//     // get user details from frontedn
//     // validation - not emmpty
//     // check if user alreasdy exsites
//     // check for images, check for avatear
//     // uplaod them to cloudinary,avatar
//     // create user object in database to create entry   
//     // remove password and refresh token from responese
//     // check for user creation
//     // return response
    
//     const {fullname,email,username, password} = req.body
//     console.log(email)
//     if([fullname,email,username,password].some((field)=> field?.trim() === "")){
//         throw new ApiError(400,"All fields are required ")
//     }
//     // if(fullname===null){
//     //     throw new ApiError(400,"fullname required")
//     // }

// })

// export {registerUser}     

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
        console.log("hellow slfkdjaslkdjfklas")
        throw new ApiError(400,"avatar file is required")
    }
    // let coverImageLocalPath
    // if(req.files && Array.isArray(req.files.coverImage) &&req.files.coverImage.length>0){
    //     coverImageLocalPath=req.files.coverImage[0].path
    // }
    console.log(avatarLocalPath)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log("India")
    console.log(avatar)
    if(!avatar){
        console.log("not uploading on cloudinry")
        throw new ApiError(400,"avatar file is required")
    }
    console.log(username)
    const user = await User.create({
        username,
        fullname,
        password,
        avatar : avatar.url,
        username,
        email,
    })
    console.log(user)
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    } 
        console.log("Request keys:", Object.keys(req));
        console.log("req.body:", req.body);
        console.log("req.file:", req.file);
        console.log("req.files:", req.files); 
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )
})

export {registerUser}
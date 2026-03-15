import { Subscription } from "../models/subscriptions.models.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const subscribeToChannel = asyncHandler(async (req,res)=>{
    const {channelId} = req.body
    if(!channelId) throw new ApiError(400, "Channel Id is REQUIRED")
    
    
    const existingSubscription = await Subscription.findOne({
        subscriber : req.user?._id,
        channel : channelId
    })
    if(existingSubscription)throw new ApiError(400, "Already Subscribed to this Channel")
    
    const subscription = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })
    if(!subscription)throw new ApiError(400 , "unable to create new subscription")
    await User.findByIdAndUpdate(channelId, {
        $inc : {subscriberCount :1}
    }) 
    return res.status(201).json(
        new ApiResponse(201, subscription, "Channel Subscribed successfully")
    )
})

const unsubscribeFromChannel = asyncHandler(async (req, res)=>{
    const {channelId} = req.body
    if(!channelId)throw new ApiError(400, "Channel ID is REQUIRED")

    const subscription = await Subscription.findOneAndDelete({
        subscriber : req.user?._id,
        channel : channelId
    }) 
    if(!subscription)throw new ApiError(404, "No Subscription found")
    await User.findByIdAndUpdate(channelId,{
            $inc : {subscriberCount : -1}
        })
    return res.status(200).json(
        new ApiResponse(200, {}, " unsubscribed successfully")
    )
})

const getChannelSubscribers = asyncHandler(async (req, res)=>{
    const {channelId} = req.params
    const {page = 1 , limit = 10} = req.query
    const subscribers = await Subscription.find({channel: channelId})
    .populate("subscriber" , "username fullname avatar")
    .limit(limit *1 )
    .skip((page - 1) * limit)
    .sort({createdAt : -1})
    const total = await Subscription.countDocuments({channel : channelId})

    return res.status(200).json(
        new ApiResponse(200,
            {
                subscribers,
                pagination : {
                    page,
                    limit,
                    total,
                    pages : Math.ceil(total/limit)
                }
            }, "Channel subscribers retrieved successfully")
    )
})


const getUserSubscriptions = asyncHandler(async (req, res)=>{
    const {page =1 , limit = 10 } = req.query

    const subscribers = await Subscription.find({subscriber : req.user?._id})
    .populate('channel', 'channelName channelDescription subscriberCount')
    .limit(limit*1)
    .skip((page-1)*limit)
    .sort({createdAt:-1})
    const total = await Subscription.countDocuments({subscriber: req.user?._id})

    return res.status(200).json(
        new ApiResponse(200,{
            subscribers,
            pagination:{
                page,
                limit,
                total,
                pages : Math.ceil(total/limit)
            }
        },"User Subscriptions retrieved successfully")
    )
})

const checkSubscriptionStatus = asyncHandler(async (req,res)=>{
    const {channelId } = req.params 
    const isSubscribed = await Subscription.exists({
        subscriber: req.user?._id,
        channel : channelId
    })
    return res.status(200)
    .json( new ApiResponse(200, {isSubscribed} , "Subscription status CHECKED"))
})

export {
    subscribeToChannel,
    unsubscribeFromChannel,
    getChannelSubscribers,
    getUserSubscriptions,
    checkSubscriptionStatus
}
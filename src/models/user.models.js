import {Schema,model} from 'mongoose'
import jwt from 'jsonwebtoken'
import logger from '../config/logger.js';
import bcrypt from 'bcrypt';    
const userSchema = Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String,
        required:true, // S3 url  
    },
    coverImage:{
        type:String,
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password:{
        type:String ,
        required:true
    },
    refreshToken:{
        type:String
    },
    channelName: {
    type: String,
    trim: true,
    default: function() {
        return this.username; 
    }
    },
    channelDescription: {
        type: String,
        trim: true,
        default: ""
    },
    subscriberCount: {
        type: Number,
        default: 0
    }
},
{
    timestamps:true,
})
userSchema.pre('save',async function(next){
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password,10)
    next()
})
userSchema.methods.isPasswordCorrect = async function (password){
    logger.debug('Password comparison for user verification');
    return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id:this._id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id:this._id,
        email : this.email,
        username:this.username ,
        fullname:this.fullname
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
)
}

export const User = model('user',userSchema)
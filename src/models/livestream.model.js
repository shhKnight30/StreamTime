import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const liveStreamSchema = new Schema({
    title:{
        type:String,
        required:true,
        trim:true,
        maxlength:100
    },
    description:{
        type:String,
        trim: true,
        maxlength:500
    },
    streamer:{
        type: Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    roomId:{
        type:String,
        required:true,
        unique:true,
        index : true
    },
    isLive:{
        type:Boolean,
        default:false,
        index:true
    },
    viewers:{
        type:Number,
        default:0,
        min:0
    },
    thumbnail:{
        type:String,
        default:null
    },
    category:{
        type:String,
        enum:['gaming','music','education','entertainment','sports','talk','other'],
        default : 'other'
    },
    tags:[{
        type:String,
        trim:true
    }],
    startTime:{
        type:Date,
        default:null
    },
    endTime:{
        type:Date,
        default:null
    },
    duration:{
        type:Number,
        default:0,
        min:0
    },
    chatEnabled:{
        type:Boolean,
        default :true
    },
    visibility:{
        type:String,
        enum:['public','private','unlisted'],
        default:'public'
    },
    peakViewers:{
        type:Number,
        default:0,
        min:0
    },
    likes: { 
        type: Number, 
        default: 0 
    },
    comments: { 
        type: Number, 
        default: 0 
    },
    totalViews:{
        type:Number,
        default:0,
        min:0
    }
},{
    timestamps:true
})

liveStreamSchema.index({streamer :1 ,isLive:1})
liveStreamSchema.index({isLive :1 ,viewwers:-1})
liveStreamSchema.index({category :1 ,isLive:1})

liveStreamSchema.plugin(mongooseAggregatePaginate)

export const LiveStream = mongoose.model('LiveStream',liveStreamSchema)
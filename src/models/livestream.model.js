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
    },
    // ===== WEBRTC SPECIFIC FIELDS =====
    isWebRTCActive:{
        type:Boolean,
        default:false,
        index:true
    },
    webRTCConfig:{
        streamKey:{
            type:String,
            default:null
        },
        maxViewers:{
            type:Number,
            default:50,
            min:1,
            max:1000
        },
        quality:{
            type:String,
            enum:['auto','low','medium','high','1080p'],
            default:'auto'
        },
        enableRecording:{
            type:Boolean,
            default:false
        },
        enableChat:{
            type:Boolean,
            default:true
        },
        enableScreenShare:{
            type:Boolean,
            default:true
        }
    },
    webRTCStats:{
        totalConnections:{
            type:Number,
            default:0,
            min:0
        },
        activeConnections:{
            type:Number,
            default:0,
            min:0
        },
        bandwidthUsed:{
            type:Number,
            default:0,
            min:0
        },
        averageLatency:{
            type:Number,
            default:0,
            min:0
        },
        connectionErrors:{
            type:Number,
            default:0,
            min:0
        }
    },
    streamSettings:{
        videoEnabled:{
            type:Boolean,
            default:true
        },
        audioEnabled:{
            type:Boolean,
            default:true
        },
        videoConstraints:{
            width:{
                type:Number,
                default:1280
            },
            height:{
                type:Number,
                default:720
            },
            frameRate:{
                type:Number,
                default:30
            }
        },
        audioConstraints:{
            echoCancellation:{
                type:Boolean,
                default:true
            },
            noiseSuppression:{
                type:Boolean,
                default:true
            },
            autoGainControl:{
                type:Boolean,
                default:true
            }
        }
    }
},{
    timestamps:true
})

liveStreamSchema.index({streamer :1 ,isLive:1})
liveStreamSchema.index({isLive :1 ,viewers:-1})
liveStreamSchema.index({category :1 ,isLive:1})

// ===== WEBRTC SPECIFIC INDEXES =====
liveStreamSchema.index({isWebRTCActive :1 ,isLive:1})
liveStreamSchema.index({isWebRTCActive :1 ,viewers:-1})
liveStreamSchema.index({streamer :1 ,isWebRTCActive:1})
liveStreamSchema.index({"webRTCConfig.quality" :1 ,isWebRTCActive:1})

liveStreamSchema.plugin(mongooseAggregatePaginate)

export const LiveStream = mongoose.model('LiveStream',liveStreamSchema)
import mongoose,{Schema} from "mongoose";

const subscriptionSchema  = new Schema({
    subscriber :{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    channel :{
        type:Schema.Types.ObjectId,
        ref:'User'
    }
},{timestamps:true})
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true })
subscriptionSchema.index({ channel: 1 })
subscriptionSchema.index({ subscriber: 1 })
export const Subscription = mongoose.model("Subscription",subscriptionSchema)
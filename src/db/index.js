import mongoose from 'mongoose';
// import express from 'express';
import dotenv from 'dotenv'

const connectDB =  async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
        console.log(`${connectionInstance.connection.host} connected successfully`)
    } catch (error) {
        console.log(error);
        throw new Error(error);         
    }
}
export default connectDB
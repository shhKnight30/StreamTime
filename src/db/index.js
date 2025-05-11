import mongoose from 'mongoose';
// import express from 'express';
import dotenv from 'dotenv'
import { DB_NAME } from '../constants.js';

const connectDB =  async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`${connectionInstance}`)
    } catch (error) {
        console.log(error);
        throw new Error(error);         
        
        
    }
}

export default connectDB
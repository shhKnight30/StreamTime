import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import logger from '../config/logger.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath){
            logger.error('No file path provided');
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        await fs.unlink(localFilePath)
        return response
    }catch(e){
        logger.error('Cloudinary upload error:', e.message);
        logger.error('Cloudinary error details:', e.error);
        if (localFilePath) {
            try {
                await fs.unlink(localFilePath);
            } catch (unlinkErr) {
                logger.error('Error deleting file:', unlinkErr);
            }
        }

        return null
    }

}

export {uploadOnCloudinary}

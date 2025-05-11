import {v2 as cloudinary} from "cloudinary"
import { log } from "console"
import fs from "fs"
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath){
            console.log("no file path")
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"image"
        })
        await fs.promises.unlink(localFilePath)
        return response
    }catch(e){
        console.log("idhar eeror hai")
        try {
      await fs.promises.unlink(localFilePath);
    } catch (unlinkErr) {
      console.error("Error deleting file:", unlinkErr);
    }

        return null
    }

}

export {uploadOnCloudinary}

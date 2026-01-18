import {v2 as cloudinary} from "cloudinary"
import { error, log } from "console"
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
            resource_type:"auto"
        })
        await fs.promises.unlink(localFilePath)
        return response
    }catch(e){
        // console.log("idhar eeror hai")
        console.log("Error while uploading ... response from the cloudinary : "+ e.message)
        console.log("loggin error  "+ e.error)
        try {
      await fs.promises.unlink(localFilePath);
    } catch (unlinkErr) {
      console.error("Error deleting file:", unlinkErr);
    }

        return null
    }

}

export {uploadOnCloudinary}

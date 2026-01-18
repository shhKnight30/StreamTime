import multer, { diskStorage } from "multer";
import fs from 'fs'
import path from 'path'

const uploadDir = './public/temp'
if(!fs.existsSync(uploadDir)){
    console.log("Creating upload directory : ", uploadDir)
    fs.mkdirSync(uploadDir,{recursive :true})
}
const storage = diskStorage({
    destination:function(req,file,cb) {
        cb(null,uploadDir)
    },
    filename:function(req,file,cb){
        cb(null,file.originalname)
    }
})

export const upload = multer({
    storage,
    limits:{
        fileSize : 100*1024*1024,
        files :2
    },
    fileFilter :(req,file,cb)=>{
        console.log("Received file : ", file.originalname , "Size:", file.size)
        cb(null,true)
    }
})

export {storage}
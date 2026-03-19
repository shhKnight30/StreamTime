import multer, { diskStorage } from "multer";
import fs from 'fs'
import path from 'path'
import logger from '../config/logger.js';

const uploadDir = './public/temp'
if(!fs.existsSync(uploadDir)){
    logger.info('Creating upload directory:', uploadDir);
    fs.mkdirSync(uploadDir,{recursive :true})
}
const storage = diskStorage({
    destination:function(req,file,cb) {
        cb(null,uploadDir)
    },
    filename: function(req, file, cb){
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
}

})

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi']
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const upload = multer({
    storage,
    limits:{
        fileSize : 100*1024*1024
    },
    fileFilter: (req, file, cb) => {
        const allowed = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES]
        if (!allowed.includes(file.mimetype)) {
            return cb(new ApiError(400, `File type ${file.mimetype} is not allowed`), false)
        }
        cb(null, true)
    }
})

export {storage}
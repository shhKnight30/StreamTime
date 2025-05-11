import multer, { diskStorage } from "multer";

const storage = diskStorage({
    destination:function(req,file,cb) {
        cb(null,"./public/temp")
    },
    filename:function(req,file,cb){
        cb(null,file.originalname)
    }
})

export const upload = multer({
    storage,
})

export {storage}
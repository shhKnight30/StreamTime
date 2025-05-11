import cookieParser from 'cookie-parser'
import express from 'express'
import cors from  "cors"

const app = express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials : true

}))

app.use(express.json({limit:"4kb"}))
app.use(express.urlencoded({extended:true,limit:'4kb'}))
app.use(express.static('public'))
app.use(cookieParser())

import  userRouter from "./routes/user.routes.js"

app.use('/api/v1/users',userRouter)

console.log("hellodskjfak")



export {app} 
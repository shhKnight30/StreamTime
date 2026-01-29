import cookieParser from 'cookie-parser'
import express from 'express'
import cors from  "cors"
import { specs, swaggerUiOptions } from './config/swagger.js';
import swaggerUi from 'swagger-ui-express';

const app = express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials : true
    
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:'4kb'}))
app.use(express.static('public'))
app.use(cookieParser())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

import  userRouter from "./routes/user.routes.js"
import  videoRouter  from './routes/video.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import playlistRouter from './routes/playlists.routes.js'
import likeRouter from './routes/like.routes.js';
import commentRouter from './routes/comments.routes.js';
import tweetRouter from './routes/tweet.routes.js';
app.use('/api/v1/users',userRouter)
app.use('/api/v1/video',videoRouter)
app.use('/api/v1/subscriptions', subscriptionRouter)
app.use('/api/v1/playlists', playlistRouter)
app.use('/api/v1/likes' , likeRouter)
app.use('api/v1/comment', commentRouter)
app.use('api/v1/tweet', tweetRouter)
export {app} 
import cookieParser from 'cookie-parser'
import express from 'express'
import cors from "cors"
import { specs, swaggerUiOptions } from './config/swagger.js';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';

const app = express()

// Rate limiting for production-grade resilience
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 100 requests
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials : true
    
}))

app.use(limiter); 

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:'4kb'}))
app.use(express.static('public'))
app.use(cookieParser())


app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(healthStatus);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

import  userRouter from "./routes/user.routes.js"
import  videoRouter  from './routes/video.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import playlistRouter from './routes/playlists.routes.js'
import likeRouter from './routes/like.routes.js';
import commentRouter from './routes/comments.routes.js';
import tweetRouter from './routes/tweet.routes.js';
import liveStreamRouter from './routes/liveStream.routes.js';
import analyticsRouter from './routes/analytics.routes.js';

app.use('/api/v1/users',userRouter)
app.use('/api/v1/video',videoRouter)
app.use('/api/v1/subscriptions', subscriptionRouter)
app.use('/api/v1/playlists', playlistRouter)
app.use('/api/v1/likes' , likeRouter)
app.use('/api/v1/comment', commentRouter)
app.use('/api/v1/tweet', tweetRouter)
app.use('/api/v1/livestream',liveStreamRouter)
app.use('/api/v1/analytics', analyticsRouter)

export {app} 
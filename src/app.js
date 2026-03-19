import cookieParser from 'cookie-parser'
import express from 'express'
import cors from "cors"
import rateLimit from 'express-rate-limit';
import { requestLogger,errorLogger,performanceLogger } from './middlewares/logger.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import './config/env.js';
import helmet from 'helmet';
const app = express()

// Rate limiting for production-grade resilience
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 100 requests
    message: 'Too many requests from this IP, please try again after 15 mins.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(requestLogger)
app.use(performanceLogger)
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials : true
    
}))
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },  // allow S3 images
    contentSecurityPolicy: false  // configure separately if needed
}))

app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true')
    next()
})
app.use(limiter); 

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:'4kb'}))
app.use(express.static('public'))
app.use(cookieParser())

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,   // 20 attempts per 15 minutes
    message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,  // only count failed attempts
})
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

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

import { User } from './models/user.models.js';
import { Video } from './models/video.models.js';
import { Tweet } from './models/tweet.model.js';
import { Subscription } from './models/subscriptions.models.js';
import { Comment } from './models/comment.models.js';
import { Like } from './models/like.models.js';
import { LiveStream } from './models/livestream.model.js';
import { Playlist } from './models/playlist.model.js';
import { UserAnalytics } from './models/userAnalytics.models.js';
import { VideoAnalytics } from './models/videoAnalytics.models.js';


import  userRouter from "./routes/user.routes.js"
import  videoRouter  from './routes/video.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import playlistRouter from './routes/playlists.routes.js'
import likeRouter from './routes/like.routes.js';
import commentRouter from './routes/comments.routes.js';
import tweetRouter from './routes/tweet.routes.js';
import liveStreamRouter from './routes/liveStream.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';

app.use('/api/v1/users',authLimiter,userRouter)
app.use('/api/v1/videos',videoRouter)
app.use('/api/v1/subscriptions', subscriptionRouter)
app.use('/api/v1/playlists', playlistRouter)
app.use('/api/v1/likes' , likeRouter)
app.use('/api/v1/comment', commentRouter)
app.use('/api/v1/tweet', tweetRouter)
app.use('/api/v1/live-stream',liveStreamRouter)
app.use('/api/v1/analytics', analyticsRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use(notFoundHandler)
app.use(errorLogger)
app.use(errorHandler)

export {app} 
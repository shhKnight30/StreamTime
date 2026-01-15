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
app.use('/api/v1/users',userRouter)
app.use('/api/v1/video',videoRouter)
app.use('/api/v1/subscriptions',subscriptionRouter)
export {app} 
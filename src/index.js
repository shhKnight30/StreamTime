import dotenv from 'dotenv';
import connectDB  from './db/index.js';
import {app} from './app.js'
import http from 'http'
import websocketServices from './services/websocket.service.js';
import logger from './config/logger.js';
import mongoose from 'mongoose';
import mediasoupService from './services/mediasoup.service.js';
dotenv.config({
    path:'./env'
    
})

const server = http.createServer(app)
websocketServices.initialize(server)
server.listen(process.env.PORT || 3000, () => {
    logger.info(`Server running on port ${process.env.PORT || 3000}`)
})

connectDB()
.then(async ()=>{
    // Initialize mediasoup workers
    await mediasoupService.initialize();
    logger.info('Mediasoup SFU initialized successfully');
    
    app.on('error',(error)=>{
        logger.error("Server error:", error);
        throw error
    })
    
    //  app.listen(process.env.PORT, ()=>{
    //     logger.info('Server is running on the port :' + process.env.PORT)
    // })
    
})
.catch((error)=>{
    logger.error("Database connection failed:", error);
})

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connections
        mongoose.connection.close(() => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
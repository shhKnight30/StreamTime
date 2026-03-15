import dotenv from 'dotenv';
import connectDB  from './db/index.js';
import {app} from './app.js'
import http from 'http'
import websocketServices from './services/websocket.service.js';
import logger from './config/logger.js';
import mongoose from 'mongoose';
import mediasoupService from './services/mediasoup.service.js';
import './config/env.js';

const server = http.createServer(app)
websocketServices.initialize(server)
 
// Connect to database first, then start server
connectDB()
.then(async ()=>{
    // Initialize mediasoup workers
    await mediasoupService.initialize();
    logger.info('Mediasoup SFU initialized successfully');
    
    // Start server only after everything is ready
    server.listen(process.env.PORT || 3000, () => {
        logger.info(`Server running on port ${process.env.PORT || 3000}`)
    })
    
    server.on('error', (error) => {
        logger.error('HTTP server error:', error);
    });
})
.catch((error)=>{
    logger.error("Database connection failed:", error);
    process.exit(1);
})

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error closing MongoDB:', error);
        process.exit(1);
    }
});
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
import mongoose from 'mongoose';
import dotenv from 'dotenv'
import logger from '../config/logger.js';

class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; 
        this.connectionTimeout = 30000; 
    }

    async connectWithRetry() {
        try {
            logger.info('Attempting to connect to MongoDB...');
            
            // Set connection options
            const options = {
                serverSelectionTimeoutMS: this.connectionTimeout,
                socketTimeoutMS: this.connectionTimeout,
                connectTimeoutMS: this.connectionTimeout,
                maxPoolSize: 10,
                minPoolSize: 5,
                maxIdleTimeMS: 30000,
                retryWrites: true,
                retryReads: true,
                bufferCommands: false,
                // bufferMaxEntries: 0
            };

            await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`, options);
            
            this.isConnected = true;
            this.retryCount = 0;
            
            logger.info(`${mongoose.connection.host} connected successfully`);
            
            // Set up connection event handlers
            this.setupEventHandlers();
            
            return true;
        } catch (error) {
            this.isConnected = false;
            this.retryCount++;
            
            logger.error(`MongoDB connection failed (attempt ${this.retryCount}/${this.maxRetries}):`, error);
            
            if (this.retryCount >= this.maxRetries) {
                logger.error('Max retry attempts reached. Database connection failed.');
                throw new Error('Database connection failed after maximum retries');
            }
            
            // Exponential backoff
            const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
            logger.info(`Retrying in ${delay}ms...`);
            
            await this.sleep(delay);
            return this.connectWithRetry();
        }
    }

    setupEventHandlers() {
        const db = mongoose.connection;

        db.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
            this.isConnected = false;
            this.handleConnectionLoss();
        });

        db.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
            this.isConnected = false;
            this.handleConnectionLoss();
        });

        db.on('reconnected', () => {
            logger.info('MongoDB reconnected');
            this.isConnected = true;
            this.retryCount = 0;
        });

        db.on('close', () => {
            logger.info('MongoDB connection closed');
            this.isConnected = false;
        });
    }

    async handleConnectionLoss() {
        if (this.retryCount < this.maxRetries) {
            logger.info('Attempting to reconnect to MongoDB...');
            try {
                await this.connectWithRetry();
            } catch (error) {
                logger.error('Reconnection failed:', error);
            }
        }
    }

    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'unhealthy', message: 'Database not connected' };
            }

            // Test database connectivity
            await mongoose.connection.db.admin().ping();
            
            return { 
                status: 'healthy', 
                message: 'Database connected',
                retryCount: this.retryCount
            };
        } catch (error) {
            logger.error('Database health check failed:', error);
            return { 
                status: 'unhealthy', 
                message: error.message,
                retryCount: this.retryCount
            };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries
        };
    }
}

const dbManager = new DatabaseManager();

const connectDB = async ()=>{
    try {
        await dbManager.connectWithRetry();
        logger.info("Database connection established successfully");
    } catch (error) {
        logger.error("Database connection failed:", error);
        throw error;
    }
}

export default connectDB
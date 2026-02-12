import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels and colors
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Custom format for development
const developmentFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        // Add stack trace if error
        if (stack) {
            log += `\n${stack}`;
        }
        
        // Add metadata if exists
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Custom format for production
const productionFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const log = {
            timestamp,
            level,
            message,
            ...meta
        };
        
        // Add stack trace if error
        if (stack) {
            log.stack = stack;
        }
        
        return JSON.stringify(log);
    })
);

// File rotation configuration for production
const fileRotateTransport = new DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '100m',
    maxFiles: '14d',
    format: productionFormat,
    level: 'info'
});

// Error file rotation
const errorRotateTransport = new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '100m',
    maxFiles: '14d',
    format: productionFormat,
    level: 'error'
});

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    levels: logLevels,
    format: productionFormat,
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: developmentFormat,
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
        }),
        
        // File transports for production
        fileRotateTransport,
        errorRotateTransport
    ],
    
    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({ 
            filename: 'logs/exceptions.log',
            format: productionFormat
        })
    ],
    
    rejectionHandlers: [
        new winston.transports.File({ 
            filename: 'logs/rejections.log',
            format: productionFormat
        })
    ],
    
    // Exit on error for production
    exitOnError: false
});

// Add request logging method
logger.logRequest = (req, res, responseTime) => {
    const logData = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?._id?.toString() || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
        logger.warn('HTTP Request Warning', logData);
    } else {
        logger.info('HTTP Request', logData);
    }
};

// Add database logging method
logger.logDatabase = (operation, collection, data, error = null) => {
    const logData = {
        operation,
        collection,
        timestamp: new Date().toISOString(),
        ...data
    };
    
    if (error) {
        logger.error('Database Error', { ...logData, error: error.message, stack: error.stack });
    } else {
        logger.info('Database Operation', logData);
    }
};

// Add WebSocket logging method
logger.logWebSocket = (event, data, socketId = null) => {
    const logData = {
        event,
        socketId,
        timestamp: new Date().toISOString(),
        ...data
    };
    
    logger.info('WebSocket Event', logData);
};

export default logger;
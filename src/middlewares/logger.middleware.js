import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

// Request logging middleware
const requestLogger = (req, res, next) => {
    // Generate unique request ID for tracing
    const requestId = uuidv4();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Record start time for response time tracking
    const startTime = Date.now();

    // Log incoming request
    logger.info('Incoming Request', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?._id?.toString() || 'anonymous',
        timestamp: new Date().toISOString()
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        // Calculate response time
        const responseTime = Date.now() - startTime;

        // Log response
        logger.logRequest(req, res, responseTime);

        // Call original end
        originalEnd.call(this, chunk, encoding);
    };

    next();
};

// Error logging enhancement middleware
const errorLogger = (err, req, res, next) => {
    const errorData = {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?._id?.toString() || 'anonymous',
        timestamp: new Date().toISOString(),
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name,
            code: err.code,
            status: err.status || err.statusCode
        },
        body: req.body,
        params: req.params,
        query: req.query
    };

    // Log error with different levels based on status code
    if (err.status >= 500) {
        logger.error('Server Error', errorData);
    } else if (err.status >= 400) {
        logger.warn('Client Error', errorData);
    } else {
        logger.error('Application Error', errorData);
    }

    next(err);
};

// Performance monitoring middleware
const performanceLogger = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    
    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Log performance metrics
        if (responseTime > 1000) { // Log slow requests (> 1 second)
            logger.warn('Slow Request Detected', {
                requestId: req.requestId,
                method: req.method,
                url: req.url,
                responseTime: `${responseTime.toFixed(2)}ms`,
                statusCode: res.statusCode,
                userId: req.user?._id?.toString() || 'anonymous'
            });
        }

        // Log memory usage for high traffic endpoints
        if (req.url.includes('/api/v1/')) {
            const memoryUsage = process.memoryUsage();
            logger.debug('Memory Usage', {
                requestId: req.requestId,
                endpoint: req.url,
                memory: {
                    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
                    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
                    external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
                }
            });
        }
    });

    next();
};

// Database operation logger
const databaseLogger = (operation) => {
    return (req, res, next) => {
        const originalJson = res.json;
        
        res.json = function(data) {
            // Log database operation
            logger.logDatabase(operation, req.params.collection || 'unknown', {
                requestId: req.requestId,
                userId: req.user?._id?.toString() || 'anonymous',
                operation: req.method,
                endpoint: req.url,
                success: res.statusCode < 400
            });

            return originalJson.call(this, data);
        };

        next();
    };
};

// Security event logger
const securityLogger = (req, res, next) => {
    // Log authentication attempts
    if (req.url.includes('/login') || req.url.includes('/register')) {
        logger.info('Authentication Attempt', {
            requestId: req.requestId,
            endpoint: req.url,
            method: req.method,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
    }

    // Log failed authentication
    res.on('finish', () => {
        if ((req.url.includes('/login') || req.url.includes('/register')) && res.statusCode === 401) {
            logger.warn('Authentication Failed', {
                requestId: req.requestId,
                endpoint: req.url,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                reason: 'Invalid credentials',
                timestamp: new Date().toISOString()
            });
        }
    });

    next();
};

// Rate limiting logger
const rateLimitLogger = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        if (res.statusCode === 429) {
            logger.warn('Rate Limit Exceeded', {
                requestId: req.requestId,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                endpoint: req.url,
                method: req.method,
                userId: req.user?._id?.toString() || 'anonymous',
                timestamp: new Date().toISOString()
            });
        }
        
        return originalSend.call(this, data);
    };

    next();
};

export {
    requestLogger,
    errorLogger,
    performanceLogger,
    databaseLogger,
    securityLogger,
    rateLimitLogger
};
import logger from '../config/logger.js';

/**
 * Final error handling middleware
 * Converts ApiError instances and unknown errors to proper JSON responses
 */
const errorHandler = (err, req, res, next) => {
    // Default error properties
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = err.errors || [];
    let success = err.success || false;

    // Handle different error types
    if (err.name === 'ValidationError') {
        // Mongoose validation error
        statusCode = 400;
        message = 'Validation Error';
        errors = Object.values(err.errors).map(e => e.message);
    } else if (err.name === 'CastError') {
        // Mongoose cast error (invalid ObjectId)
        statusCode = 400;
        message = 'Invalid ID format';
    } else if (err.name === 'JsonWebTokenError') {
        // JWT error
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        // JWT expired
        statusCode = 401;
        message = 'Token expired';
    }

    // Log the error (errorLogger middleware should have already logged it)
    logger.error('Unhandled Error', {
        requestId: req.requestId,
        statusCode,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
    });

    // Prepare error response
    const errorResponse = {
        success,
        message,
        errors: errors.length > 0 ? errors : undefined,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            error: err.name
        })
    };

    // Send response
    res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found middleware
 * Handles unmatched routes
 */
const notFoundHandler = (req, res, next) => {
    // Ignore favicon requests silently
    if (req.path === '/favicon.ico') {
        return res.status(204).end();
    }

    const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
    error.statusCode = 404;
    error.success = false;

    logger.info('Route Not Found', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    });

    next(error);
};

export { errorHandler, notFoundHandler };

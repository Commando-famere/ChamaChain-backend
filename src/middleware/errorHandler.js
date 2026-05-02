// Global Error Handler
const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token', code: 401 });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired', code: 401 });
    }
    
    // Database errors
    if (err.code === '23505') {
        return res.status(409).json({ success: false, message: 'Duplicate entry', code: 409 });
    }
    if (err.code === '23503') {
        return res.status(400).json({ success: false, message: 'Referenced record not found', code: 400 });
    }
    
    // Default
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : err.message;
    
    res.status(statusCode).json({
        success: false,
        message: message,
        code: statusCode
    });
};

module.exports = errorHandler;

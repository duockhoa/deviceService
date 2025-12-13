const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Structured error log without leaking stack to client
    console.error(
        JSON.stringify(
            {
                timestamp: new Date().toISOString(),
                path: req.originalUrl,
                method: req.method,
                status: statusCode,
                message,
                userId: req.user?.id || null,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            },
            null,
            2
        )
    );

    res.status(statusCode).json({
        success: false,
        message,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    asyncHandler
};

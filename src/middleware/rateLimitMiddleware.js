const rateLimit = require('express-rate-limit');

const enabled = process.env.RATE_LIMIT_ENABLED !== 'false';
const passThrough = (req, res, next) => next();

const apiLimiter = enabled
    ? rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : req.ip),
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        }
    })
    : passThrough;

const authLimiter = enabled
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.ip,
        message: {
            success: false,
            message: 'Too many authentication attempts, please try again later.'
        }
    })
    : passThrough;

module.exports = {
    apiLimiter,
    authLimiter
};

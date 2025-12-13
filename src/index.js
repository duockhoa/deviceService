require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3009;
const path = require('path');

// Import RBAC models để Sequelize tạo bảng
require('./models/role.model');
require('./models/permission.model');
require('./models/rolePermission.model');
require('./models/userRole.model');

require('./jobs');

// cookie-parser
var cookieParser = require('cookie-parser');
app.use(cookieParser());

// cors
const cors = require('cors');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            const error = new Error('Not allowed by CORS');
            error.statusCode = 403;
            return callback(error);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);

// body-parser
app.use(express.json({ limit: '100MB' }));
app.use(express.urlencoded({ limit: '100MB', extended: true }));

// static
app.use(express.static(path.join(__dirname, '../', 'public')));

// rate limiting
const { apiLimiter, authLimiter } = require('./middleware/rateLimitMiddleware');
app.use(apiLimiter);
app.use('/api/v1/auth', authLimiter);

// request logging (structured)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
            JSON.stringify(
                {
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    path: req.originalUrl,
                    status: res.statusCode,
                    duration_ms: duration,
                    userId: req.user?.id || null,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }
            )
        );
    });
    next();
});

// routes
const router = require('./routes/index.js');
const { errorHandler } = require('./middleware/errorHandler');
app.use('/api/v1/', router);
app.get('/', (req, res) => {
    res.send('Device Service is running');
});

// error handler last
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

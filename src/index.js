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

const { startJobs } = require('./jobs');

// cookie-parser
var cookieParser = require('cookie-parser');
app.use(cookieParser());

// cors
const cors = require('cors');
const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === '1' || process.env.ALLOWED_ORIGINS === '*';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// Allow exact matches and simple wildcard entries like *.example.com
const originMatchers = allowedOrigins.map((origin) => {
    if (!origin.includes('*')) {
        let normalized = origin;
        try {
            normalized = new URL(origin).origin;
        } catch {
            // keep the raw origin if it cannot be parsed
        }
        return (incomingOrigin) => {
            try {
                return new URL(incomingOrigin).origin === normalized;
            } catch {
                return incomingOrigin === normalized;
            }
        };
    }

    const strippedOrigin = origin.replace(/^https?:\/\//, '');
    const baseDomain = strippedOrigin.replace(/^\*\./, '');
    return (incomingOrigin) => {
        try {
            const { hostname } = new URL(incomingOrigin);
            return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
        } catch {
            return false;
        }
    };
});

const isAllowedOrigin = (origin) => {
    if (!origin) return true; // allow same-origin/non-browser requests
    try {
        const { hostname } = new URL(origin);
        if (hostname.endsWith('dkpharma.io.vn')) {
            return true;
        }
    } catch {
        // fall through to matcher checks below
    }
    return originMatchers.some((matcher) => matcher(origin));
};

// If ALLOW_ALL_ORIGINS is set, short-circuit to allow any origin (echo back request origin)
if (allowAllOrigins) {
    app.use(
        cors({
            origin: true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
        })
    );
} else {
    app.use(
        cors({
            origin: (origin, callback) => {
                if (isAllowedOrigin(origin)) {
                    return callback(null, true);
                }
                const error = new Error('Not allowed by CORS');
                error.statusCode = 403;
                return callback(error);
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
        })
    );
}

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

// V1 API
app.use('/api/v1/', router);

app.get('/', (req, res) => {
    res.send('Device Service is running');
});

// error handler last
app.use(errorHandler);

app.listen(port, async () => {
    console.log(`Example app listening on port ${port}`);
    
    // Start background jobs after server is up
    await startJobs();
});

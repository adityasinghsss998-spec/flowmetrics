const express = require('express');
const http = require('http');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { authMiddleware } = require('./middlewares/authMiddleware');
const { optionalAuthMiddleware } = require('./middlewares/optionalAuthMiddleware');
const { githubTokenMiddleware } = require('./middlewares/githubTokenMiddleware');
dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── CORS ────────────────────────────────────────────────────────────────────

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Authorization',
        'Content-Type',
        'x-github-token',
    ],
    credentials: true,
}));

// ─── RATE LIMITING ───────────────────────────────────────────────────────────

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: 'Too many requests, please try again later' },
    skip: () => process.env.NODE_ENV !== 'production',
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    message: { message: 'Too many auth attempts, please try again later' },
    skip: () => process.env.NODE_ENV !== 'production',
});

app.use(globalLimiter);

// ─── BLOCK INTERNAL ROUTES FROM EXTERNAL TRAFFIC ─────────────────────────────

app.use('/api/v1/internal', (req, res) => {
    res.status(403).json({ message: 'Forbidden' });
});

const handleProxyReq = (proxyReq, req) => {
    if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
    }
    if (req.headers['x-github-token']) {
        proxyReq.setHeader('x-github-token', req.headers['x-github-token']);
    }
};

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth/login', authLimiter, createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/auth/login' },
    on: {
        error: (err, req, res) => {
            res.status(503).json({ message: 'Auth service unavailable' });
        },
    },
}));

app.use('/api/v1/auth/register', authLimiter, createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/auth/register' },
    on: {
        error: (err, req, res) => {
            res.status(503).json({ message: 'Auth service unavailable' });
        },
    },
}));

app.use('/api/v1/auth', optionalAuthMiddleware, createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/auth/' },
    on: {
        proxyReq: handleProxyReq,
        error: (err, req, res) => {
            res.status(503).json({ message: 'Auth service unavailable' });
        },
    },
}));

// ─── ORGS (auth-service handles orgs too) ────────────────────────────────────

app.use('/api/v1/orgs', authMiddleware, createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/orgs/' },
    on: {
        proxyReq: handleProxyReq,
        error: (err, req, res) => {
            res.status(503).json({ message: 'Auth service unavailable' });
        },
    },
}));

// ─── GITHUB SERVICE ───────────────────────────────────────────────────────────

app.use('/api/v1/webhooks', createProxyMiddleware({
    target: process.env.GITHUB_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/webhooks/' },
    on: {
        error: (err, req, res) => {
            res.status(503).json({ message: 'GitHub service unavailable' });
        },
    },
}));

app.use('/api/v1/repos', authMiddleware, githubTokenMiddleware, createProxyMiddleware({
    target: process.env.GITHUB_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/repos/' },
    on: {
        proxyReq: handleProxyReq,
        error: (err, req, res) => {
            res.status(503).json({ message: 'GitHub service unavailable' });
        },
    },
}));

// ─── ANALYTICS SERVICE ────────────────────────────────────────────────────────

app.use('/api/v1/analytics', authMiddleware, createProxyMiddleware({
    target: process.env.ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/analytics/' },
    on: {
        proxyReq: handleProxyReq,
        error: (err, req, res) => {
            res.status(503).json({ message: 'Analytics service unavailable' });
        },
    },
}));

// ─── HEALTH ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            auth: process.env.AUTH_SERVICE_URL,
            github: process.env.GITHUB_SERVICE_URL,
            analytics: process.env.ANALYTICS_SERVICE_URL,
            dashboard: process.env.DASHBOARD_SERVICE_URL,
        },
    });
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
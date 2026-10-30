const express = require('express');
const http = require('http');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { authMiddleware } = require('./middlewares/authMiddleware');
const { optionalAuthMiddleware } = require('./middlewares/optionalAuthMiddleware');
const { githubTokenMiddleware } = require('./middlewares/githubTokenMiddleware');
const { aiAllowlistMiddleware } = require('./middlewares/aiAllowlistMiddleware');
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
    if (req.headers['x-user-name']) {
        proxyReq.setHeader('x-user-name', req.headers['x-user-name']);
    }
    if (req.headers['x-user-email']) {
        proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
    }
    if (req.headers['x-user-github']) {
        proxyReq.setHeader('x-user-github', req.headers['x-user-github']);
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

app.use('/api/v1/invitations', authMiddleware, createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/invitations/' },
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
// ─── AI SERVICE ───────────────────────────────────────────────────────────────

if (!process.env.AI_INTERNAL_KEY) {
    console.warn('AI_INTERNAL_KEY is not set. The AI service will reject every request.');
}

const handleAiProxyReq = (proxyReq, req) => {
    // The AI service never needs the login token, cookies or the GitHub token. Do not send them.
    proxyReq.removeHeader('authorization');
    proxyReq.removeHeader('cookie');
    proxyReq.removeHeader('x-github-token');
    proxyReq.removeHeader('x-user-name');
    proxyReq.removeHeader('x-user-email');
    proxyReq.removeHeader('x-user-github');
    proxyReq.removeHeader('x-org-id');

    // authMiddleware already put the user id from the verified token into req.headers.
    // setHeader replaces any value a browser tried to send for the same header.
    proxyReq.setHeader('x-user-id', String(req.headers['x-user-id']));

    // This proves to the AI service that the request came through the gateway.
    proxyReq.setHeader('x-internal-key', process.env.AI_INTERNAL_KEY || '');
};

app.use('/api/v1/ai', authMiddleware, aiAllowlistMiddleware, createProxyMiddleware({
    target: process.env.AI_SERVICE_URL,
    changeOrigin: true,
    // A question can take up to 80 seconds inside the AI service. Wait a little longer than that,
    // so the AI service's own timeout message arrives first.
    proxyTimeout: 90000,
    timeout: 90000,
    on: {
        proxyReq: handleAiProxyReq,
        error: (err, req, res) => {
            console.log('AI service proxy error:', err.message);
            if (res.headersSent) {
                return;
            }
            // The frontend reads fallback: true and hides the AI panel gracefully.
            res.status(503).json({ message: 'AI service unavailable', fallback: true });
        },
    },
}));

// ─── HEALTH ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    const services = [
        { name: 'auth', url: process.env.AUTH_SERVICE_URL },
        { name: 'github', url: process.env.GITHUB_SERVICE_URL },
        { name: 'analytics', url: process.env.ANALYTICS_SERVICE_URL },
        { name: 'ai', url: process.env.AI_SERVICE_URL }, // Keep the AI service warm too!
    ];

    // Fire pings in parallel — don't wait for results
    // Just wakes them up, doesn't block the health response
    services.forEach(({ url }) => {
        // Node 18+ has native fetch. If using an older version, you may need to require('node-fetch') or axios.
        if (url) {
            fetch(`${url}/health`).catch(() => {});
        }
    });

    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            auth: process.env.AUTH_SERVICE_URL,
            github: process.env.GITHUB_SERVICE_URL,
            analytics: process.env.ANALYTICS_SERVICE_URL,
            ai: process.env.AI_SERVICE_URL,
        },
    });
});
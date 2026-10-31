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

// Trust the one proxy in front of us (Render), so rate limiting sees each visitor's real IP
// instead of treating every visitor as the same person.
app.set('trust proxy', 1);

// ─── CORS ────────────────────────────────────────────────────────────────────

// CLIENT_URL is the primary production origin. We also accept all Vercel
// preview deployments for this project so branch previews can call the API
// without needing a Render env-var update for every new Vercel preview URL.
const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL || 'http://localhost:3001',
    // All flowmetrics-frontend Vercel deployments (production + branch previews)
    /^https:\/\/flowmetrics-frontend(-[a-z0-9-]+)?\.vercel\.app$/,
    // Any localhost port for local development
    /^http:\/\/localhost:\d+$/,
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no Origin header (server-to-server, curl, etc.)
        if (!origin) return callback(null, true);
        const allowed = ALLOWED_ORIGINS.some((o) =>
            o instanceof RegExp ? o.test(origin) : o === origin
        );
        if (allowed) return callback(null, true);
        callback(new Error('CORS: origin not allowed: ' + origin));
    },
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
    skip: (req) => {
        if (process.env.NODE_ENV !== 'production') {
            return true;
        }
        // Health check and warmup routes should never count against the rate limit
        if (req.path === '/health' || req.path === '/warmup') {
            return true;
        }
        // Checking on an AI answer happens every few seconds. The AI service limits it itself.
        return req.originalUrl.startsWith('/api/v1/ai/runs/');
    },
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

app.use(['/api/v1/orgs', '/api/v1/organizations'], authMiddleware, createProxyMiddleware({
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
    // Starting a question and checking on it are both quick calls now. The long wait is the
    // AI service waking up from sleep on Render (up to about a minute), so allow for that.
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

// ─── HEALTH AND WARM-UP ───────────────────────────────────────────────────────

// /health is cheap and wakes nothing. It does not expose any service addresses.
app.get('/health', (req, res) => {
    wakeDownstreamServices();
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// How long to wait before waking the other services again, however many requests arrive.
const WARM_UP_INTERVAL_MS = 5 * 60 * 1000;
let lastWarmUpTime = 0;

const wakeDownstreamServices = () => {
    const now = Date.now();
    if (now - lastWarmUpTime < WARM_UP_INTERVAL_MS) {
        return;
    }
    lastWarmUpTime = now;

    const serviceUrls = [
        process.env.AUTH_SERVICE_URL,
        process.env.GITHUB_SERVICE_URL,
        process.env.ANALYTICS_SERVICE_URL,
        process.env.DASHBOARD_SERVICE_URL,
        process.env.NOTIFICATION_SERVICE_URL,
        process.env.AI_SERVICE_URL,
    ];

    for (let i = 0; i < serviceUrls.length; i++) {
        const url = serviceUrls[i];
        if (!url) {
            continue;
        }
        // We do not wait for the answer. The request alone wakes a sleeping service.
        // Any answer, even "not found", counts. The timeout stops requests piling up.
        fetch(url + '/health', { signal: AbortSignal.timeout(65000) }).catch(() => {});
    }
};

// The website calls this when a visitor opens it. A monitor can call it too (see the notes).
app.get('/warmup', (req, res) => {
    wakeDownstreamServices();
    res.status(200).json({ status: 'warming' });
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
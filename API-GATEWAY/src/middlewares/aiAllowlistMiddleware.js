// Only these exact requests may reach the AI service. Everything else gets a 404.
// Run ids are checked with a strict pattern so tricks like "/runs/../anomaly/scan" cannot get through.
const RUN_ID_PATH = /^\/runs\/[A-Za-z0-9_-]{8,64}$/;

const aiAllowlistMiddleware = (req, res, next) => {
    const method = req.method;
    // Inside app.use('/api/v1/ai', ...), req.path is relative to the mount point (for example "/chat").
    const path = req.path;

    if (method === 'POST' && path === '/chat') {
        return next();
    }
    if (method === 'GET' && RUN_ID_PATH.test(path)) {
        return next();
    }
    if (method === 'POST' && path === '/hitl/approve') {
        return next();
    }
    if (method === 'GET' && path === '/hitl/pending') {
        return next();
    }

    return res.status(404).json({ message: 'Not found' });
};

module.exports = { aiAllowlistMiddleware };
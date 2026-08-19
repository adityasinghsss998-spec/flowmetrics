const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const optionalAuthMiddleware = (req, res, next) => {
    const header = req.headers['authorization'];
    const token = header ? header.split(' ')[1] : req.query?.token;

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
        req.headers['x-user-id'] = String(decoded.id);
        req.headers['x-user-name'] = decoded.name || '';
        req.headers['x-user-email'] = decoded.email || '';
        req.headers['x-user-github'] = decoded.github_username || '';
    } catch (e) {
    }

    next();
};

module.exports = { optionalAuthMiddleware };
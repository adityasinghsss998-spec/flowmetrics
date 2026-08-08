const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const authMiddleware = (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = header.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Malformed token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

        req.headers['x-user-id'] = String(decoded.id);
        req.headers['x-user-name'] = decoded.name || '';
        req.headers['x-user-email'] = decoded.email || '';
        req.headers['x-user-github'] = decoded.github_username || '';

        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = { authMiddleware };
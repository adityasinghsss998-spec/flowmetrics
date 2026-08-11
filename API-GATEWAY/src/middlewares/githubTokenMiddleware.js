const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config(); 

const githubTokenMiddleware = async (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const response = await axios.get(
            `${process.env.AUTH_SERVICE_URL}/api/v1/internal/users/${userId}/github-token`,
            { timeout: 3000 }
        );

        req.headers['x-github-token'] = response.data.data.github_access_token;
        next();
    } catch (e) {
        if (e.response && e.response.status === 404) {
            return res.status(403).json({
                message: 'GitHub account not connected. Please connect your GitHub account first.',
                code: 'GITHUB_NOT_CONNECTED',
            });
        }

        if (e.code === 'ECONNABORTED') {
            return res.status(503).json({ message: 'Auth service timeout while fetching GitHub token' });
        }

        return res.status(500).json({ message: 'Failed to fetch GitHub token' });
    }
};

module.exports = { githubTokenMiddleware };
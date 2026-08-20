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

        if (response.data?.data?.github_access_token) {
            req.headers['x-github-token'] = response.data.data.github_access_token;
        }
        next();
    } catch (e) {
        // If user has not connected GitHub (404) or auth service is temporarily slow,
        // let the request proceed. Routes that strictly require a token will validate it.
        next();
    }
};

module.exports = { githubTokenMiddleware };
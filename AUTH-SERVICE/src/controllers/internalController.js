const { getGithubToken } = require('../config/redis');

const getUserGithubToken = async (req, res) => {
    try {
        const { userId } = req.params;
        const token = await getGithubToken(userId);

        if (!token) {
            return res.status(404).json({
                data: null,
                message: 'GitHub token not found. User must connect a GitHub account.',
            });
        }

        return res.status(200).json({
            data: {
                github_access_token: token,
            },
        });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
};

module.exports = { getUserGithubToken };
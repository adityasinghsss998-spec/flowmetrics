const { getGithubToken } = require('../config/redis');
const { UserRepository } = require('../repository/userRepository');

const userRepo = new UserRepository();

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

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userRepo.findById(userId);

        if (!user) {
            return res.status(404).json({
                data: null,
                message: 'User not found',
            });
        }

        return res.status(200).json({
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                github_username: user.github_username,
            },
        });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
};

module.exports = { getUserGithubToken, getUserById };
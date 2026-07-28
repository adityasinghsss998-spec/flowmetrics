const { AuthService } = require('../services/authService');
const authService = new AuthService();

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const result = await authService.register(name, email, password);
        res.status(201).json({ data: result, message: 'User registered successfully' });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json({ data: result, message: 'Login successful' });
    } catch (e) {
        res.status(401).json({ message: e.message });
    }
};

const githubRedirect = (req, res) => {
    const url = authService.getGithubAuthUrl();
    res.redirect(url);
};

const githubCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) throw new Error('No code received from GitHub');

        const result = await authService.handleGithubCallback(code);

        res.redirect(
            `${process.env.CLIENT_URL}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`
        );
    } catch (e) {
        res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(e.message)}`);
    }
};

const refresh = async (req, res) => {
    try {
        const result = await authService.refresh(req.body.refreshToken);
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(401).json({ message: e.message });
    }
};

const logout = async (req, res) => {
    try {
        await authService.logout(req.headers['x-user-id']);
        res.status(200).json({ message: 'Logged out' });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const me = async (req, res) => {
    try {
        res.status(200).json({
            data: {
                id: req.headers['x-user-id'],
                name: req.headers['x-user-name'],
                email: req.headers['x-user-email'],
                github_username: req.headers['x-user-github'],
            },
        });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

module.exports = { register, login, githubRedirect, githubCallback, refresh, logout, me };
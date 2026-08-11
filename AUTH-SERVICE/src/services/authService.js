const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
const {UserRepository}=require('../repository/userRepository')
const {OrgRepository}=require('../repository/orgRepository')
const { setGithubToken } = require('../config/redis');
dotenv.config();

const DUMMY_HASH = '$2b$10$e7xX3h8z8M0eBq2K3J7O0uYwA1bC2d3e4f5g6h7i8j9k0l1m2n3o4';
const REQUEST_TIMEOUT = 5000;

class AuthService {
    constructor() {
        this.userRepo = new UserRepository();
        this.orgRepo = new OrgRepository();
    }

    signAccess(payload) {
        return jwt.sign(payload, process.env.ACCESS_SECRET, { expiresIn: '7d' });
    }

    signRefresh(payload) {
        return jwt.sign(payload, process.env.REFRESH_SECRET, { expiresIn: '7d' });
    }

    async register(name, email, password) {
        try {
            const existing = await this.userRepo.findByEmail(email);
            if (existing) throw new Error('Email already registered');

            const hashed = await bcrypt.hash(password, 10);
            const user = await this.userRepo.create({
                name,
                email,
                password: hashed,
            });

            return {
                id: user.id,
                name: user.name,
                email: user.email,
            };
        } catch (e) {
            console.error('Registration error:', e.message);
            throw e;
        }
    }

    async login(email, password) {
        try {
            const user = await this.userRepo.findByEmail(email);

            const hashToCompare = (user && user.password) ? user.password : DUMMY_HASH;
            const match = await bcrypt.compare(password, hashToCompare);

            if (!user || !user.password || !match) {
                throw new Error('Invalid credentials');
            }

            const payload = {
                id: user.id,
                name: user.name,
                email: user.email,
                github_username: user.github_username,
            };

            const accessToken = this.signAccess(payload);
            const refreshToken = this.signRefresh({ id: user.id });

            const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
            await this.userRepo.updateById(user.id, { refresh_token: hashedRefreshToken });

            return { accessToken, refreshToken, user: payload };
        } catch (e) {
            console.error('Login error:', e.message);
            throw e;
        }
    }

    getGithubAuthUrl(state) {
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            redirect_uri: process.env.GITHUB_CALLBACK_URL,
            scope: 'repo read:org user:email',
            state: state || crypto.randomBytes(16).toString('hex'),
        });
        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    async handleGithubCallback(code, existingUserId = null) {
        try {
            const tokenRes = await axios.post(
                'https://github.com/login/oauth/access_token',
                {
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                },
                {
                    headers: { Accept: 'application/json' },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const githubAccessToken = tokenRes.data.access_token;
            if (!githubAccessToken) throw new Error('GitHub OAuth failed — no access token returned');

            const profileRes = await axios.get('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${githubAccessToken}`,
                    Accept: 'application/vnd.github+json',
                },
                timeout: REQUEST_TIMEOUT,
            });

            const githubProfile = profileRes.data;
            let user;

            if (existingUserId) {
                user = await this.userRepo.updateById(existingUserId, {
                    github_id: githubProfile.id,
                    github_username: githubProfile.login,
                    github_access_token: githubAccessToken,
                    avatar_url: githubProfile.avatar_url,
                });
            } else {
                user = await this.userRepo.findByGithubId(githubProfile.id);

                if (!user) {
                    const emailRes = await axios.get('https://api.github.com/user/emails', {
                        headers: {
                            Authorization: `Bearer ${githubAccessToken}`,
                            Accept: 'application/vnd.github+json',
                        },
                        timeout: REQUEST_TIMEOUT,
                    });

                    const verifiedPrimaryEmail = emailRes.data.find(
                        (e) => e.primary && e.verified
                    )?.email;

                    if (verifiedPrimaryEmail) {
                        user = await this.userRepo.findByEmail(verifiedPrimaryEmail);
                    }

                    if (user) {
                        user = await this.userRepo.updateById(user.id, {
                            github_id: githubProfile.id,
                            github_username: githubProfile.login,
                            github_access_token: githubAccessToken,
                            avatar_url: githubProfile.avatar_url,
                        });
                    } else {
                        user = await this.userRepo.create({
                            name: githubProfile.name || githubProfile.login,
                            email: verifiedPrimaryEmail || `${githubProfile.login}@github.local`,
                            github_id: githubProfile.id,
                            github_username: githubProfile.login,
                            github_access_token: githubAccessToken,
                            avatar_url: githubProfile.avatar_url,
                        });
                    }
                } else {
                    user = await this.userRepo.updateById(user.id, {
                        github_access_token: githubAccessToken,
                        avatar_url: githubProfile.avatar_url,
                    });
                }
            }

            await setGithubToken(user.id, githubAccessToken);

            const payload = {
                id: user.id,
                name: user.name,
                email: user.email,
                github_username: user.github_username,
            };

            const accessToken = this.signAccess(payload);
            const refreshToken = this.signRefresh({ id: user.id });

            const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
            await this.userRepo.updateById(user.id, { refresh_token: hashedRefreshToken });

            return { accessToken, refreshToken, user: payload };
        } catch (e) {
            console.error('GitHub auth error:', e.message);
            throw e;
        }
    }

    async refresh(token) {
        try {
            if (!token) throw new Error('No refresh token provided');

            const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
            const user = await this.userRepo.findById(decoded.id);

            if (!user || !user.refresh_token) {
                throw new Error('Invalid refresh token');
            }

            const isMatch = await bcrypt.compare(token, user.refresh_token);
            if (!isMatch) {
                throw new Error('Invalid refresh token');
            }

            const payload = {
                id: user.id,
                name: user.name,
                email: user.email,
                github_username: user.github_username,
            };

            const accessToken = this.signAccess(payload);
            return { accessToken };
        } catch (e) {
            console.error('Refresh token error:', e.message);
            throw e;
        }
    }

    async logout(userId) {
        try {
            await this.userRepo.updateById(userId, { refresh_token: null });
        } catch (e) {
            console.error('Logout error:', e.message);
            throw e;
        }
    }
}

module.exports = { AuthService };
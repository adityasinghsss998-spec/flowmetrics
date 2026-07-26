const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const dotenv = require('dotenv');
const {UserRepository} = require('../repository/userRepository')
const {OrgRepository}=require('../repository/orgRepository')
dotenv.config();

class AutheService {
    constructor() {
        this.userRepo = new UserRepository();
        this.orgRepo = new OrgRepository();
    }
    signAccess(payload) {
        return jwt.sign(payload, process.env.ACCESS_SECRET, { expiresIn: '1d' });
    }

    signRefresh(payload) {
        return jwt.sign(payload, process.env.REFRESH_SECRET, { expiresIn: '7d' });
    }
    
    async register(name, email, password) {
        try{
           const existing =await this.userRepo.findByEmail(email);
           if(existing){
            throw new Error('User already exists');
           }

           const hashed=await bcrypt.hash(password,10);
           const user=await this.userRepo.create({
            name,email,
            password:hashed,
           });
           return {
              id:user.id,
              name:user.name,
              email:user.email
           }
           
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async login(email,password){
        try{
            const user = await this.userRepo.findByEmail(email);
            if (!user || !user.password) throw new Error('Invalid credentials');

            const match=await bcrypt.compare(password,user.password);
            if(!match)  throw new Error('Invalid credentials');

             const payload = {
                id: user.id,
                name: user.name, 
                email: user.email,
                github_username: user.github_username,
            };
            const accessToken = this.signAccess(payload);
            const refreshToken = this.signRefresh({ id: user.id });
            await this.userRepo.updateById(user.id, { refresh_token: refreshToken });

            return { accessToken, refreshToken, user: payload };


        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    getGithubAuthUrl() {
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            redirect_uri: process.env.GITHUB_CALLBACK_URL,
            scope: 'repo read:org user:email',
        });
        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    async handleGithubCallback(code) {
        try {
            const tokenRes = await axios.post(
                'https://github.com/login/oauth/access_token',
                {
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                },
                { headers: { Accept: 'application/json' } }
            );

            const githubAccessToken = tokenRes.data.access_token;
            if (!githubAccessToken) throw new Error('GitHub OAuth failed — no access token returned');

            const profileRes = await axios.get('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${githubAccessToken}`,
                    Accept: 'application/vnd.github+json',
                },
            });

            const githubProfile = profileRes.data;

            let user = await this.userRepo.findByGithubId(githubProfile.id);

            if (!user) {
                const emailRes = await axios.get('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `Bearer ${githubAccessToken}`,
                        Accept: 'application/vnd.github+json',
                    },
                });

                const primaryEmail = emailRes.data.find((e) => e.primary)?.email;

                if (primaryEmail) {
                    user = await this.userRepo.findByEmail(primaryEmail);
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
                        email: primaryEmail || `${githubProfile.login}@github.local`,
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

            const payload = {
                id: user.id,
                name: user.name,
                email: user.email,
                github_username: user.github_username,
            };

            const accessToken = this.signAccess(payload);
            const refreshToken = this.signRefresh({ id: user.id });

            await this.userRepo.updateById(user.id, { refresh_token: refreshToken });

            return { accessToken, refreshToken, user: payload };
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async refresh(token) {
        try {
            if (!token) throw new Error('No refresh token provided');

            const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
            const user = await this.userRepo.findById(decoded.id);

            if (!user || user.refresh_token !== token) {
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
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }
    async logout(userId) {
        try {
            await this.userRepo.updateById(userId, { refresh_token: null });
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }
    
}
module.exports={
    AutheService
}
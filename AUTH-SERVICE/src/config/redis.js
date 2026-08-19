const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => console.log('Auth Service Redis connected'));
redis.on('error', (e) => console.log('Auth Service Redis error', e.message));

const setGithubToken = async (userId, token) => {
    await redis.set(
        `github_token:user_${userId}`,
        token,
        'EX',
        60 * 60 * 24 * 7
    );
};

const getGithubToken = async (userId) => {
    return await redis.get(`github_token:user_${userId}`);
};

module.exports = { redis, setGithubToken, getGithubToken };
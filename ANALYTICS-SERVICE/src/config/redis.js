const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redis = new Redis(process.env.REDIS_URL, {
    keepAlive: 10000,
    retryStrategy: (t) => Math.min(t * 50, 2000)
});

redis.on('connect', () => console.log('Analytics Redis connected'));
redis.on('error', (e) => console.log('Analytics Redis error', e.message));

const get = async (key) => {
    try {
        const val = await redis.get(key);
        return val ? JSON.parse(val) : null;
    } catch (e) {
        console.log('Redis get error', e.message);
        return null;
    }
};

const set = async (key, value, ttlSeconds) => {
    try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (e) {
        console.log('Redis set error', e.message);
    }
};

const del = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (e) {
        console.log('Redis del error', e.message);
    }
};

module.exports = { get, set, del };
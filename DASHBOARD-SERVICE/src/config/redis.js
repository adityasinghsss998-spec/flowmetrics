const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();
const redisOptions = {
    keepAlive: 10000,
    retryStrategy: (times) => {
        return Math.min(times * 50, 2000); 
    }
};

const pub = new Redis(process.env.REDIS_URL,redisOptions);
const sub = new Redis(process.env.REDIS_URL,redisOptions);

pub.on('connect', () => console.log('Dashboard Redis publisher connected'));
sub.on('connect', () => console.log('Dashboard Redis subscriber connected'));
pub.on('error', (e) => console.log('Redis pub error:', e.message));
sub.on('error', (e) => console.log('Redis sub error:', e.message));

module.exports = { pub, sub };
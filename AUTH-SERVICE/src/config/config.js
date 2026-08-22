require('dotenv').config();

const dbConfig = {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'flowmetrics_auth',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true' ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {}
};

module.exports = {
    development: dbConfig,
    production: dbConfig,
};
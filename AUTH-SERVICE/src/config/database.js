const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'flowmetrics_auth',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'Aditya@2006', 
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
        dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? {
                require: true,
                rejectUnauthorized: false,
            } : false,
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

const connect = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL connected successfully');
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
};

module.exports = { sequelize, connect };
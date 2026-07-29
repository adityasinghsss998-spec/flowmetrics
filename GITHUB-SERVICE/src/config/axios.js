const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const authClient = axios.create({
    baseURL: process.env.AUTH_SERVICE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000,
});

module.exports = { authClient };
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { connect: connectDb } = require('./config/database');
const { connect: connectRabbit } = require('./config/rabbitmq');
const routes = require('./routes/v1/index');

dotenv.config();

const app = express();
app.use((req, res, next) => {
    console.log(`[AUTH SERVICE RECEIVED] ${req.method} ${req.originalUrl}`);
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'auth-service running' });
});

const start = async () => {
    await connectDb();
    await connectRabbit();
    app.listen(process.env.PORT, () => {
        console.log(`Auth service running on port ${process.env.PORT}`);
    });
};

start();
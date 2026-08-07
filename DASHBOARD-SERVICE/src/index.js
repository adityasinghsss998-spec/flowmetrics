const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const { connect: connectRabbit } = require('./config/rabbitmq');
const { init: initSocket } = require('./socket/dashboardSocket');
const eventConsumer = require('./consumers/eventConsumer');

dotenv.config();

const app = express();
const server = http.createServer(app);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'dashboard-service running' });
});

const start = async () => {
    try {
        await connectRabbit();

        initSocket(server);

        await eventConsumer.start();

        server.listen(process.env.PORT, () => {
            console.log(`Dashboard Service running on port ${process.env.PORT}`);
        });
    } catch (e) {
        console.log('Dashboard Service failed to start:', e.message);
        process.exit(1);
    }
};

start();
const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { connect } = require('./config/database');
const routes = require('./routes/v1/index')
dotenv.config();
const {scheduleWeeklyDigests}=require('./utils/index')
const { connect: connectRabbit } = require('./config/rabbitmq');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'github-service running' });
});
const start = async () => {
    await connect();
    await connectRabbit();
    scheduleWeeklyDigests();
    app.listen(process.env.PORT, () => {
        console.log(`GitHub Service running on port ${process.env.PORT}`);
    });
};


start();
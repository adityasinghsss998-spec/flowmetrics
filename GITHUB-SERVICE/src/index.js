const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { connect } = require('./config/database');
const routes = require('./routes/v1/index');

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'github-service running' });
});

const start = async () => {
    await connect();
    app.listen(process.env.PORT, () => {
        console.log(`GitHub Service running on port ${process.env.PORT}`);
    });
};

start();
require('dotenv').config();
const express = require('express');
const { connect } = require('./config/rabbitmq');
const weeklyDigestConsumer = require('./consumers/weeklyDigestConsumer');
const anomalyConsumer = require('./consumers/anomalyConsumer');
const invitationConsumer = require('./consumers/invitationConsumer');

const app = express();
const PORT = process.env.PORT || 3006;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'notification-service' });
});

app.listen(PORT, () => {
  console.log(`Notification Service HTTP server running on port ${PORT}`);
});

const start = async () => {
  try {
    await connect();

    await weeklyDigestConsumer.start();
    await anomalyConsumer.start();
    await invitationConsumer.start();

    console.log('Notification Service running — all consumers active');
  } catch (e) {
    console.log('Notification Service failed to start:', e.message);
    process.exit(1);
  }
};

start();
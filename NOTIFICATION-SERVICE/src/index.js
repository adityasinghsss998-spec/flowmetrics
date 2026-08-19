const dotenv = require('dotenv');
const { connect } = require('./config/rabbitmq');
const weeklyDigestConsumer = require('./consumers/weeklyDigestConsumer');
const anomalyConsumer = require('./consumers/anomalyConsumer');
const invitationConsumer = require('./consumers/invitationConsumer');

dotenv.config();

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
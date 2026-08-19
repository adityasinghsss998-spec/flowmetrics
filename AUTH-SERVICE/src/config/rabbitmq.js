const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

let channel = null;

const connect = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');

        connection.on('error', (err) => {
            console.log('Auth Service RabbitMQ error:', err.message);
        });

        channel = await connection.createChannel();
        await channel.assertExchange('flowmetrics', 'topic', { durable: true });

        console.log('Auth Service RabbitMQ connected');
    } catch (e) {
        console.log('Auth Service RabbitMQ connection failed:', e.message);
    }
};

const publish = (routingKey, data) => {
    try {
        if (!channel) {
            console.log('RabbitMQ channel not initialized, skipping publish');
            return;
        }

        channel.publish(
            'flowmetrics',
            routingKey,
            Buffer.from(JSON.stringify(data)),
            { persistent: true }
        );

        console.log(`Published event: ${routingKey}`);
    } catch (e) {
        console.log('Failed to publish event:', e.message);
    }
};

module.exports = { connect, publish };

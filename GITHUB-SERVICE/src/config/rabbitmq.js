const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

let channel = null;

const connect = async () => {
    try {
        const conn = await amqp.connect(process.env.RABBITMQ_URL);

        conn.on('error', (err) => {
            console.log('GitHub Service RabbitMQ error:', err.message);
        });

        channel = await conn.createChannel();
        await channel.assertExchange('flowmetrics', 'topic', { durable: true });

        console.log('GitHub Service RabbitMQ connected');
    } catch (e) {
        console.log('GitHub Service RabbitMQ connection failed:', e.message);
        throw e;
    }
};

const publish = (routingKey, data) => {
    try {
        if (!channel) throw new Error('RabbitMQ channel not initialized');

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
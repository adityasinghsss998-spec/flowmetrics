const amqp = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

let connection = null;
let channel = null;

const connect = async () => {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL);

        connection.on('error', (err) => {
            console.log('RabbitMQ connection error:', err.message);
        });

        connection.on('close', () => {
            console.log('RabbitMQ connection closed');
        });

        channel = await connection.createChannel();

        await channel.assertExchange('flowmetrics', 'topic', { durable: true });
        
        await channel.assertExchange('flowmetrics.dlx', 'topic', { durable: true });
        await channel.assertQueue('dlq.weekly_digest', { durable: true });
        await channel.assertQueue('dlq.anomaly_alert', { durable: true });
        await channel.bindQueue('dlq.weekly_digest', 'flowmetrics.dlx', 'dlq.weekly_digest');
        await channel.bindQueue('dlq.anomaly_alert', 'flowmetrics.dlx', 'dlq.anomaly_alert');

        console.log('Notification Service RabbitMQ connected');
        return channel;
    } catch (e) {
        console.log('RabbitMQ connection failed:', e.message);
        throw e;
    }
};

const getChannel = () => channel;

module.exports = { connect, getChannel };
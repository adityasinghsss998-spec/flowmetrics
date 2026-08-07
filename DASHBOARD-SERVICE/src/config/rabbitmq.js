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

        console.log('Dashboard Service RabbitMQ connected');
        return channel;
    } catch (e) {
        console.log('RabbitMQ connection failed:', e.message);
        throw e;
    }
};

const getChannel = () => channel;

module.exports = { connect, getChannel };
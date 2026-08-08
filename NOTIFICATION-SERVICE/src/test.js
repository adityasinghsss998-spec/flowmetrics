const amqp = require('amqplib');

async function test() {
    // Connect to your local RabbitMQ
    const conn = await amqp.connect('amqp://localhost');
    const ch = await conn.createChannel();

    // Ensure the exchange exists 
    await ch.assertExchange('flowmetrics', 'topic', { durable: true });

    // Publish the fake alert payload
    ch.publish('flowmetrics', 'anomaly.detected', Buffer.from(JSON.stringify({
        repoId: 1,
        repoName: 'aditya/kanban-workspace',
        recipientEmail: 'adityakumar.sd123@gmail.com', // Your email to receive the test
        anomalyType: 'cycle_time_spike',
        description: 'Average PR cycle time increased from 4 hours to 18 hours in the last 7 days.',
        currentValue: '18 hours',
        threshold: '8 hours',
        detectedAt: new Date().toISOString(),
    })));

    console.log('Published anomaly.detected event');
    setTimeout(() => conn.close(), 500);
}

test();
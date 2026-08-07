const { getChannel } = require('../config/rabbitmq');
const { broadcastToRepo } = require('../socket/dashboardSocket');

const EVENT_MAPPINGS = {
    'pr.merged': 'pr:merged',
    'pr.opened': 'pr:opened',
    'pr.closed': 'pr:closed',
    'deployment.completed': 'deployment:completed',
    'deployment.failed': 'deployment:failed',
    'anomaly.detected': 'anomaly:detected',
    'anomaly.cycle_time': 'anomaly:detected',
    'anomaly.deployment': 'anomaly:detected',
    'anomaly.stale_prs': 'anomaly:detected',
};

const start = async () => {
    const ch = getChannel();

    const queue = 'dashboard.realtime_events';

    await ch.assertQueue(queue, {
        durable: false,
        arguments: {
            'x-message-ttl': 60000,
        },
    });

    await ch.bindQueue(queue, 'flowmetrics', 'pr.*');
    await ch.bindQueue(queue, 'flowmetrics', 'deployment.*');
    await ch.bindQueue(queue, 'flowmetrics', 'anomaly.*');

    ch.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const routingKey = msg.fields.routingKey;
            const payload = JSON.parse(msg.content.toString());
            const { repoId, ...eventData } = payload;

            const socketEvent = EVENT_MAPPINGS[routingKey] || 'data:updated';

            await broadcastToRepo(repoId, socketEvent, {
                routingKey,
                data: eventData,
                timestamp: new Date().toISOString(),
            });

            ch.ack(msg);
            console.log(`Broadcasted ${socketEvent} to repo:${repoId}`);
        } catch (e) {
            console.log('Event consumer processing failed:', e.message);
            ch.nack(msg, false, false);
        }
    });

    console.log('Dashboard event consumer listening...');
};

module.exports = { start };
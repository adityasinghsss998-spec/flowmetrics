const { getChannel } = require('../config/rabbitmq');
const { sendMail } = require('../config/mailer');
const { generateAnomalyAlertHtml } = require('../templates/anomalyAlert');

const start = async () => {
    const ch = getChannel();

    const queue = 'notification.anomaly_alert';

    await ch.assertQueue(queue, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': 'flowmetrics.dlx',
            'x-dead-letter-routing-key': 'dlq.anomaly_alert',
        },
    });

    await ch.bindQueue(queue, 'flowmetrics', 'anomaly.#');

    ch.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const payload = JSON.parse(msg.content.toString());
            const {
                recipientEmail,
                repoName,
                anomalyType,
                description,
                currentValue,
                threshold,
                detectedAt,
            } = payload;

            console.log(`Processing anomaly alert: ${anomalyType} → ${recipientEmail}`);

            const html = generateAnomalyAlertHtml({
                repoName,
                anomalyType,
                description,
                currentValue,
                threshold,
                detectedAt,
            });

            await sendMail({
                to: recipientEmail,
                subject: `⚠ FlowMetrics Alert — ${anomalyType.replace(/_/g, ' ')} in ${repoName}`,
                html,
            });

            ch.ack(msg);
            console.log(`Anomaly alert sent to ${recipientEmail}`);
        } catch (e) {
            console.log('Anomaly alert processing failed:', e.message);
            ch.nack(msg, false, false);
        }
    });

    console.log('Anomaly alert consumer listening...');
};

module.exports = { start };
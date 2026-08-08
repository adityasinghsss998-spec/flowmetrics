const axios = require('axios');
const { getChannel } = require('../config/rabbitmq');
const { sendMail } = require('../config/mailer');
const { generateWeeklyDigestHtml } = require('../templates/weeklyDigest');
const dotenv = require('dotenv');
      
dotenv.config();
            
const fetchMetricsForDigest = async (repoId) => {
    try {
        const [doraRes, openPrsRes] = await Promise.all([
            axios.get(`${process.env.ANALYTICS_SERVICE_URL}/api/v1/analytics/dora`, {
                params: { repoId, days: 7 },
            }),
            axios.get(`${process.env.ANALYTICS_SERVICE_URL}/api/v1/analytics/prs/open`, {
                params: { repoId },
            }),
        ]);

        return {
            dora: doraRes.data.data,
            openPrs: openPrsRes.data.data || [],
        };
    } catch (e) {
        console.log('Failed to fetch metrics for digest:', e.message);
        throw e;
    }
};
  
const start = async () => {
    const ch = getChannel();

    const queue = 'notification.weekly_digest';

    await ch.assertQueue(queue, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': 'flowmetrics.dlx',
            'x-dead-letter-routing-key': 'dlq.weekly_digest',
        },
    });

    await ch.bindQueue(queue, 'flowmetrics', 'weekly.digest');

    ch.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const payload = JSON.parse(msg.content.toString());
            const { recipientEmail, orgName, repoName, repoId } = payload;

            console.log(`Processing weekly digest for ${repoName} → ${recipientEmail}`);

            const now = new Date();
            const weekEnd = now.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            const weekStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const weekStart = weekStartDate.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long'
            });

            const { dora, openPrs } = await fetchMetricsForDigest(repoId);

            const html = generateWeeklyDigestHtml({
                orgName,
                repoName,
                weekStart,
                weekEnd,
                metrics: {
                    deployment_frequency: dora.deployment_frequency,
                    lead_time: dora.lead_time,
                    change_failure_rate: dora.change_failure_rate,
                    mean_time_to_recovery: dora.mean_time_to_recovery,
                    open_prs: openPrs,
                },
            });

            await sendMail({
                to: recipientEmail,
                subject: `FlowMetrics Weekly Digest — ${repoName} (${weekStart})`,
                html,
            });
 
            ch.ack(msg);
            console.log(`Weekly digest sent to ${recipientEmail}`);
        } catch (e) {
            console.log('Weekly digest processing failed:', e.message);
            ch.nack(msg, false, false);
        }
    });
 
    console.log('Weekly digest consumer listening...');
};
    
module.exports = { start }; 
 

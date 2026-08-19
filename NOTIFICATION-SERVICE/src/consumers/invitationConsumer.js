const { getChannel } = require('../config/rabbitmq');
const { sendMail } = require('../config/mailer');
const { generateMemberInvitationHtml } = require('../templates/memberInvitation');

const start = async () => {
    const channel = getChannel();
    const queue = 'notification.member_invitation';

    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, 'flowmetrics', 'member.invited');

    channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const payload = JSON.parse(msg.content.toString());
            const {
                recipientEmail,
                orgName,
                inviterName,
                role,
                token,
                expiresAt,
            } = payload;

            console.log(`Processing member invitation for: ${recipientEmail}`);

            const html = generateMemberInvitationHtml({
                orgName,
                inviterName,
                role,
                token,
                expiresAt,
            });

            await sendMail({
                to: recipientEmail,
                subject: `Invitation to join ${orgName} on FlowMetrics`,
                html,
            });

            channel.ack(msg);
            console.log(`Member invitation sent to ${recipientEmail}`);
        } catch (e) {
            console.log('Member invitation processing failed:', e.message);
            channel.nack(msg, false, false);
        }
    });

    console.log('Member invitation consumer listening...');
};

module.exports = { start };

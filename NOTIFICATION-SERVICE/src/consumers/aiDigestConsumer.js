const {getChannel} = require('../config/rabbitmq');
const {sendMail} = require('../config/mailer')
const {generateAiDigestHtml} = require('../templates/aiDigest')

const start = async()=>{
    const ch=getChannel();
    const queue = 'notification_ai_digest'

    await ch.assertQueue(queue,{
        durable:true,
        arguments:{
            'x-dead-letter-exchange':'flowmetrics.dlx',
            'x-dead-letter-routing-key':'dlq.digest.ready',
        },
    });

    await ch.bindQueue(queue,'flowmetrics','ai.digest.ready');
    ch.consume(queue,async(msg)=>{
        if(!msg) return;
        try{
            const payload = JSON.parse(msg.content.toString())
            const {recipientEmail,orgName,repoName,narrative,generatedAt}=payload
             if (!recipientEmail || !narrative) {
                console.log('AI digest message is missing recipientEmail or narrative, skipping');
                ch.ack(msg);
                return;
            }
            console.log(`Processing AI digest for ${repoName} → ${recipientEmail}`);

            const html=generateAiDigestHtml({
                orgName,
                repoName,
                narrative,
                generatedAt,
            })
            await sendMail({
                to:recipientEmail,
                subject: `FlowMetrics AI Weekly Summary — ${repoName}`,
                html,
            })
            ch.ack(msg);
            console.log(`AI digest sent to ${recipientEmail}`);

        } catch (e) {
            console.log('AI digest processing failed:', e.message);
            ch.nack(msg, false, false);
        }
    })
 console.log('AI digest consumer listening...');
}
module.exports={start} 
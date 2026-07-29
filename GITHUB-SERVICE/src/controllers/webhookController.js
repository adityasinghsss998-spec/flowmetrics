const { WebhookService } = require('../services/webhookService');
const webhookService = new WebhookService();
const handleWebhook = async(req,res)=>{
    try {
        const signature = req.headers['x-hub-signature-256'];
        if (!signature) {
            return res.status(401).json({ message: 'No signature provided' });
        }
        
        const isValid = webhookService.verifySignature(
            JSON.stringify(req.body),
            signature
        );

         if (!isValid) {
            return res.status(401).json({ message: 'Invalid webhook signature' });
        }

        const event = req.headers['x-github-event'];

        res.status(200).json({message:'Webhook received and validated',event});

        if (event === 'pull_request') {
            await webhookService.handlePullRequest(req.body);
        } else if (event === 'pull_request_review') {
            await webhookService.handlePullRequestReview(req.body);
        } else if (event === 'deployment') {
            await webhookService.handleDeployment(req.body);
        } else if (event === 'deployment_status') {
            await webhookService.handleDeploymentStatus(req.body);
        }
         
    } catch (e) {
        console.log('Webhook processing error', e.message);
    }
}
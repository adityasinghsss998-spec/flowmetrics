const router = require('express').Router();
const repoController = require('../../controllers/repoController');
const webhookController = require('../../controllers/webhookController');

router.get('/repos/available', repoController.getAvailableRepos);
router.post('/repos/connect', repoController.connectRepo);
router.delete('/repos/:id', repoController.disconnectRepo);
router.get('/repos/org/:orgId', repoController.getOrgRepos);

router.post('/webhooks/github', webhookController.handleWebhook);

module.exports = router;
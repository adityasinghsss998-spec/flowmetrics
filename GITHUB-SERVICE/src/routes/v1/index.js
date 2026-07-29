const router = require('express').Router();
const repoController = require('../../controllers/repoController');
const webhookController = require('../../controllers/webhookController');
const { requireOrgRole } = require('../../middlewares/requireOrgRole');

router.get('/repos/available', repoController.getAvailableRepos);

router.get(
    '/repos/org/:orgId',
    requireOrgRole(['owner', 'admin', 'member']),
    repoController.getOrgRepos
);

router.post(
    '/repos/connect',
    requireOrgRole(['owner', 'admin']),
    repoController.connectRepo
);

router.delete(
    '/repos/:id',
    requireOrgRole(['owner', 'admin']),
    repoController.disconnectRepo
);

router.post('/webhooks/github', webhookController.handleWebhook);

module.exports = router;
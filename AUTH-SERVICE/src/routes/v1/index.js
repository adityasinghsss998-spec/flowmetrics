const router = require('express').Router();
const authController = require('../../controllers/authController');
const orgController = require('../../controllers/orgController');
const internalController = require('../../controllers/internalController');
const memberController = require('../../controllers/memberController');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/github', authController.githubRedirect);
router.get('/auth/github/callback', authController.githubCallback);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout); 
router.get('/auth/me', authController.me);

router.post('/orgs', orgController.createOrg);
router.get('/orgs', orgController.getMyOrgs);
router.get('/orgs/:slug', orgController.getOrg);
router.post('/orgs/:orgId/members', orgController.inviteMember);

router.post('/orgs/:orgId/invitations', memberController.sendInvitation);
router.get('/orgs/:orgId/invitations', memberController.getInvitations);
router.post('/invitations/:token/accept', memberController.acceptInvitation);
router.get('/orgs/:orgId/members', memberController.getMembers);
router.delete('/orgs/:orgId/members/:userId', memberController.removeMember);
router.patch('/orgs/:orgId/members/:userId/role', memberController.changeMemberRole);

router.get('/internal/orgs/:orgId/members/:userId/role', orgController.getRole);

router.get('/auth/github/connect', authController.githubConnectRedirect);
router.get('/internal/users/:userId/github-token', internalController.getUserGithubToken);

module.exports = router; 
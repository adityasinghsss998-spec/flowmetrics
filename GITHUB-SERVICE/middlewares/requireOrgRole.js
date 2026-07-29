const { authClient } = require('../config/axios');

const requireOrgRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const orgId = req.body.orgId || req.params.orgId || req.query.orgId;
            if (!orgId) {
                return res.status(400).json({ message: 'orgId is required' });
            }

            const response = await authClient.get(
                `/api/v1/internal/orgs/${orgId}/members/${userId}/role`
            );

            const { role } = response.data.data || response.data;

            if (!allowedRoles.includes(role)) {
                return res.status(403).json({
                    message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}. Your role: ${role}`,
                });
            }

            req.userOrgRole = role;
            req.verifiedOrgId = parseInt(orgId);
            next();
        } catch (e) {
            if (e.response?.status === 404) {
                return res.status(403).json({
                    message: 'You are not a member of this organization',
                });
            }

            if (e.code === 'ECONNABORTED') {
                return res.status(503).json({
                    message: 'Authorization service timeout — try again',
                });
            }

            console.log('Role check failed', e.message);
            res.status(500).json({ message: 'Authorization check failed' });
        }
    };
};

module.exports = { requireOrgRole };
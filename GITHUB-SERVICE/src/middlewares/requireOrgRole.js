const { authClient } = require('../config/axios');
const { RepoRepository } = require('../repositories/repoRepository');
const repoRepo = new RepoRepository();

const requireOrgRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            let orgId = req.params?.orgId || req.query?.orgId || req.body?.orgId;
            const targetRepoId = req.params?.id || req.params?.repoId;
            if (!orgId && targetRepoId) {
                const repo = (await repoRepo.findById(targetRepoId)) || (await repoRepo.findByGithubId(targetRepoId));
                if (repo) {
                    orgId = repo.org_id;
                }
            }

            if (!orgId) {
                return res.status(400).json({ message: 'orgId is required' });
            } 

            const response = await authClient.get(
                `/api/v1/internal/orgs/${orgId}/members/${userId}/role`
            );
            

            const  role  = response.data.data || response.data;
            
           console.log(role)
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({
                    message: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}. Your role: ${role}`,
                });
            }

            req.userOrgRole = role;
            req.verifiedOrgId = parseInt(orgId);
            next();
        } catch (e) {
            console.log('Auth Service Error Status:', e.response?.status);
    console.log('Auth Service Error Data:', e.response?.data);
    console.log('Raw Error:', e.message);

    if (e.response?.status === 404) {
        return res.status(403).json({
            message: 'You are not a member of this organization',
        });
    }

    if (e.code === 'ECONNREFUSED') {
        return res.status(503).json({
            message: 'Auth service is offline or unreachable',
        });
    }

    res.status(500).json({ 
        message: 'Authorization check failed',
        error: e.response?.data?.message || e.message 
    });
        }
    };
};

module.exports = { requireOrgRole };
const { ManualDeploymentService } = require('../services/manualDeploymentService');
const { RepoRepository } = require('../repositories/repoRepository');

const manualDeploymentService = new ManualDeploymentService();
const repoRepository = new RepoRepository();

const recordDeployment = async (req, res) => {
    try {
        const repoId = req.params.repoId;
        const orgId = req.query.orgId;
        const { environment, status, sha, deployedByUsername, deployedAt, completedAt } = req.body;

        if (!environment) {
            return res.status(400).json({ message: 'Environment is required' });
        }
        if (status !== 'success' && status !== 'failure') {
            return res.status(400).json({ message: 'Status must be success or failure' });
        }
        if (!deployedAt) {
            return res.status(400).json({ message: 'Deployed at timestamp is required' });
        }

        const repo = await repoRepository.findById(repoId);
        if (!repo) {
            return res.status(404).json({ message: 'Repository not found' });
        }

        if (String(repo.org_id) !== String(orgId)) {
            return res.status(403).json({ message: 'Repository does not belong to the specified organization' });
        }

        const finalCompletedAt = completedAt || new Date().toISOString();

        const deployment = await manualDeploymentService.recordDeployment(repoId, {
            environment,
            status,
            sha,
            deployedByUsername,
            deployedAt,
            completedAt: finalCompletedAt
        });

        return res.status(201).json({ data: deployment, message: 'Deployment recorded successfully' });
    } catch (e) {
        console.log('Error recording manual deployment', e.message);
        return res.status(500).json({ message: 'Failed to record deployment' });
    }
};

module.exports = { recordDeployment };

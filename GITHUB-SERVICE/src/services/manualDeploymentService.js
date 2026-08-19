const axios = require('axios');
const { RepoRepository } = require('../repositories/repoRepository');
const { DeploymentRepository } = require('../repositories/deploymentRepository');
const { publish } = require('../config/rabbitmq');

class ManualDeploymentService {
    constructor() {
        this.repoRepo = new RepoRepository();
        this.deploymentRepo = new DeploymentRepository();
    }

    async recordDeployment(repoId, deploymentData) {
        try {
            const { environment, status, sha, deployedByUsername, deployedAt, completedAt } = deploymentData;

            const repo = await this.repoRepo.findById(repoId);
            if (!repo) {
                throw new Error('Repository not found');
            }

            const parsedDeployedAt = new Date(deployedAt);
            const parsedCompletedAt = completedAt ? new Date(completedAt) : null;
            let buildDurationMinutes = null;

            if (parsedCompletedAt) {
                const diff = parsedCompletedAt - parsedDeployedAt;
                buildDurationMinutes = Math.round((diff / (1000 * 60)) * 100) / 100;
            }

            const deployment = await this.deploymentRepo.create({
                github_deployment_id: null,
                repo_id: repo.id,
                environment: environment,
                status: status,
                sha: sha || null,
                deployed_by_username: deployedByUsername || null,
                deployed_at: parsedDeployedAt,
                completed_at: parsedCompletedAt,
                build_duration_minutes: buildDurationMinutes
            });

            publish(status === 'success' ? 'deployment.completed' : 'deployment.failed', {
                repoId: repo.id,
                environment: environment,
                status: status,
                buildDurationMinutes: buildDurationMinutes,
                deployedAt: parsedDeployedAt,
                completedAt: parsedCompletedAt
            });

            try {
                await axios.delete(`http://localhost:3003/api/v1/analytics/cache/${repo.id}`);
            } catch (cacheError) {
                console.log('Error invalidating analytics cache', cacheError.message);
            }

            return deployment;
        } catch (e) {
            console.log('Something went wrong at the manual deployment service layer', e);
            throw e;
        }
    }
}

module.exports = { ManualDeploymentService };

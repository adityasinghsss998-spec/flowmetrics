const { Deployment } = require('../models');

class DeploymentRepository {
    async createIfNotExists(data) {
        try {
            const [deployment, created] = await Deployment.findOrCreate({
                where: { github_deployment_id: data.github_deployment_id },
                defaults: data,
            });
            return { deployment, created };
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async updateStatus(githubDeploymentId, statusData) {
        try {
            const deployment = await Deployment.findOne({
                where: { github_deployment_id: githubDeploymentId },
            });

            if (!deployment) return null;

            await deployment.update(statusData);
            return deployment;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByGithubId(githubDeploymentId) {
        try {
            return await Deployment.findOne({
                where: { github_deployment_id: githubDeploymentId },
            });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async create(data) {
        try {
            return await Deployment.create(data);
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
}

module.exports = { DeploymentRepository };
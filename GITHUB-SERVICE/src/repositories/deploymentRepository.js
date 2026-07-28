const { Deployment } = require('../models');

class DeploymentRepository {
    async upsert(data) {
        try {
            const [deployment, created] = await Deployment.findOrCreate({
                where: { github_deployment_id: data.github_deployment_id },
                defaults: data,
            });

            if (!created) {
                await deployment.update(data);
            }

            return deployment;
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
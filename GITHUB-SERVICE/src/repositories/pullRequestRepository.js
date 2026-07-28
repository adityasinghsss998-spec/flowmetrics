const { PullRequest } = require('../models');

class PullRequestRepository {
    async upsert(data) {
        try {
            const [pr, created] = await PullRequest.findOrCreate({
                where: {
                    repo_id: data.repo_id,
                    number: data.number,
                },
                defaults: data,
            });

            if (!created) {
                await pr.update(data);
            }

            return pr;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByRepoAndNumber(repoId, number) {
        try {
            return await PullRequest.findOne({
                where: { repo_id: repoId, number },
            });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findById(id) {
        try {
            return await PullRequest.findByPk(id);
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async updateById(id, data) {
        try {
            await PullRequest.update(data, { where: { id } });
            return await PullRequest.findByPk(id);
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async bulkUpsert(prs) {
        try {
            const results = await Promise.all(prs.map((pr) => this.upsert(pr)));
            return results;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
}

module.exports = { PullRequestRepository };
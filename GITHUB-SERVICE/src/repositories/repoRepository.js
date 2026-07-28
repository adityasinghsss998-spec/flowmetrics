const { Repository } = require('../models');

class RepoRepository {
    async create(data) {
        try {
            const repo = await Repository.create(data);
            return repo;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByGithubId(githubRepoId) {
        try {
            return await Repository.findOne({
                where: { github_repo_id: githubRepoId },
            });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findById(id) {
        try {
            return await Repository.findByPk(id);
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByOrgId(orgId) {
        try {
            return await Repository.findAll({ where: { org_id: orgId } });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async updateById(id, data) {
        try {
            await Repository.update(data, { where: { id } });
            return await Repository.findByPk(id);
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async deleteById(id) {
        try {
            await Repository.destroy({ where: { id } });
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
}

module.exports = { RepoRepository };
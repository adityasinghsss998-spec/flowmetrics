const { User } = require('../models');

class UserRepository {
    async create(data) {
        try {
            const user = await User.create(data);
            return user;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByEmail(email) {
        try {
            const user = await User.findOne({ where: { email } });
            return user;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findByGithubId(githubId) {
        try {
            const user = await User.findOne({ where: { github_id: githubId } });
            return user;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async findById(id) {
        try {
            const user = await User.findByPk(id);
            return user;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async updateById(id, data) {
        try {
            await User.update(data, { where: { id } });
            const user = await User.findByPk(id);
            return user;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
}

module.exports = { UserRepository };
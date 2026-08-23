const { RepoService } = require('../services/repoService');
const repoService = new RepoService();

const getAvailableRepos = async (req, res) => {
    try {
        console.log(req.headers['x-github-token']); 
        const result = await repoService.getAvailableRepos(
            req.headers['x-github-token']
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const connectRepo = async (req, res) => {
    try {
        console.log(req.headers['x-github-token']);
        const result = await repoService.connectRepo(
            req.verifiedOrgId,
            req.headers['x-user-id'],
            req.headers['x-github-token'],
            req.body.fullName 
        );
        res.status(201).json({
            data: result,
            message: 'Repository connected. Historical sync running in background.',
        });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const disconnectRepo = async (req, res) => {
    try {
        const repo = await repoService.getRepoById(req.params?.id);
        if (!repo) {
            return res.status(404).json({ message: 'Repository not found' });
        }

        if (repo.org_id !== req.verifiedOrgId) {
            return res.status(403).json({
                message: 'This repository does not belong to your organization',
            });
        }
        const accessToken = req.headers['x-github-token'] || repo.github_access_token;
        await repoService.disconnectRepo(
            repo.id,
            accessToken
        );
        res.status(200).json({ success: true, message: 'Repository disconnected successfully' });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getOrgRepos = async (req, res) => {
    try {
        const result = await repoService.getOrgRepos(req.verifiedOrgId);
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

module.exports = { getAvailableRepos, connectRepo, disconnectRepo, getOrgRepos };
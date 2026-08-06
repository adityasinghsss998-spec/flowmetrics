const { AnalyticsService } = require('../services/analyticsService');
const analyticsService = new AnalyticsService();

const getDoraDashboard = async (req, res) => {
    try {
        const { repoId, days = 30 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getDoraDashboard(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getCycleTimeTrend = async (req, res) => {
    try {
        const { repoId, days = 90 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getCycleTimeTrend(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getCycleTimeSummary = async (req, res) => {
    try {
        const { repoId, days = 30 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getCycleTimeSummary(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getPrSizeAnalysis = async (req, res) => {
    try {
        const { repoId, days = 30 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getPrSizeAnalysis(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getContributorLeaderboard = async (req, res) => {
    try {
        const { repoId, days = 30 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getContributorLeaderboard(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getContributorTrend = async (req, res) => {
    try {
        const { repoId, days = 90 } = req.query;
        const { username } = req.params;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getContributorTrend(
            parseInt(repoId), username, parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getReviewHeatmap = async (req, res) => {
    try {
        const { repoId, days = 90 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getReviewHeatmap(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getDeploymentFrequencyTrend = async (req, res) => {
    try {
        const { repoId, days = 84 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getDeploymentFrequencyTrend(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getBuildDurationTrend = async (req, res) => {
    try {
        const { repoId, days = 84 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getBuildDurationTrend(
            parseInt(repoId), parseInt(days)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getRecentDeployments = async (req, res) => {
    try {
        const { repoId, limit = 15 } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getRecentDeployments(
            parseInt(repoId), parseInt(limit)
        );
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const getOpenPrs = async (req, res) => {
    try {
        const { repoId } = req.query;
        if (!repoId) throw new Error('repoId is required');
        const result = await analyticsService.getOpenPrs(parseInt(repoId));
        res.status(200).json({ data: result });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

const invalidateCache = async (req, res) => {
    try {
        const { repoId } = req.params;
        await analyticsService.invalidateRepoCache(parseInt(repoId));
        res.status(200).json({ message: 'Cache invalidated successfully' });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

module.exports = {
    getDoraDashboard,
    getCycleTimeTrend,
    getCycleTimeSummary,
    getPrSizeAnalysis,
    getContributorLeaderboard,
    getContributorTrend,
    getReviewHeatmap,
    getDeploymentFrequencyTrend,
    getBuildDurationTrend,
    getRecentDeployments,
    getOpenPrs,
    invalidateCache,
};
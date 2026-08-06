const router = require('express').Router();
const controller = require('../../controllers/analyticsController');

router.get('/dora', controller.getDoraDashboard);

router.get('/cycle-time/trend', controller.getCycleTimeTrend);
router.get('/cycle-time/summary', controller.getCycleTimeSummary);
router.get('/cycle-time/by-size', controller.getPrSizeAnalysis);

router.get('/contributors', controller.getContributorLeaderboard);
router.get('/contributors/:username/trend', controller.getContributorTrend);
router.get('/reviews/heatmap', controller.getReviewHeatmap);

router.get('/deployments/frequency', controller.getDeploymentFrequencyTrend);
router.get('/deployments/build-duration', controller.getBuildDurationTrend);
router.get('/deployments/recent', controller.getRecentDeployments);

router.get('/prs/open', controller.getOpenPrs);

router.delete('/cache/:repoId', controller.invalidateCache);

module.exports = router;
const { DoraRepository } = require('../repositories/doraRepository');
const { CycleTimeRepository } = require('../repositories/cycleTimeRepository');
const { ContributorRepository } = require('../repositories/contributorRepository');
const { DeploymentRepository } = require('../repositories/deploymentRepository');
const cache = require('../config/redis');

class AnalyticsService {
    constructor() {
        this.doraRepo = new DoraRepository();
        this.cycleRepo = new CycleTimeRepository();
        this.contributorRepo = new ContributorRepository();
        this.deploymentRepo = new DeploymentRepository();
    }

    calculateTrend(current, previous) {
        if (previous === null || previous === undefined) return null;
        const prev = parseFloat(previous);
        const curr = parseFloat(current);
        if (prev === 0) return null;
        return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
    }

    classifyDoraLevel(metric, value) {
        if (value === null || value === undefined) return 'unknown';
        const v = parseFloat(value);

        const levels = {
            deployment_frequency_per_day: [
                { level: 'elite', min: 1 },
                { level: 'high', min: 1 / 7 },
                { level: 'medium', min: 1 / 30 },
                { level: 'low', min: 0 },
            ],
            lead_time_hours: [
                { level: 'elite', max: 24 },
                { level: 'high', max: 168 },
                { level: 'medium', max: 720 },
                { level: 'low', max: Infinity },
            ],
            failure_rate_percent: [
                { level: 'elite', max: 5 },
                { level: 'high', max: 10 },
                { level: 'medium', max: 30 },
                { level: 'low', max: Infinity },
            ],
            mttr_hours: [
                { level: 'elite', max: 1 },
                { level: 'high', max: 24 },
                { level: 'medium', max: 168 },
                { level: 'low', max: Infinity },
            ],
        };

        const thresholds = levels[metric];
        if (!thresholds) return 'unknown';

        if (metric === 'deployment_frequency_per_day') {
            for (const t of thresholds) {
                if (v >= t.min) return t.level;
            }
        } else {
            for (const t of thresholds) {
                if (v <= t.max) return t.level;
            }
        }

        return 'low';
    }

    async getDoraDashboard(repoId, days = 30) {
        try {
            const cacheKey = `dora:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const [
                deployFreq,
                prevDeployFreq,
                leadTime,
                failureRate,
                mttr,
            ] = await Promise.all([
                this.doraRepo.getDeploymentFrequency(repoId, days),
                this.doraRepo.getPreviousPeriodDeploymentFrequency(repoId, days),
                this.doraRepo.getLeadTime(repoId, days),
                this.doraRepo.getChangeFailureRate(repoId, days),
                this.doraRepo.getMeanTimeToRecovery(repoId, days),
            ]);

            const deployFreqPerDay = parseFloat(deployFreq.deployments_per_day) || 0;
            const prevDeployFreqPerDay = parseFloat(prevDeployFreq.deployments_per_day) || 0;
            const avgLeadTime = parseFloat(leadTime.avg_lead_time_hours);
            const avgCycleTime = parseFloat(leadTime.avg_cycle_time_hours);
            const failureRatePercent = parseFloat(failureRate.failure_rate_percent) || 0;
            const mttrHours = parseFloat(mttr?.avg_mttr_hours) || null;

            const result = {
                period_days: days,
                deployment_frequency: {
                    deployments_per_day: deployFreqPerDay,
                    deployments_per_week: deployFreqPerDay * 7,
                    total_deployments: parseInt(deployFreq.total_deployments) || 0,
                    successful: parseInt(deployFreq.successful) || 0,
                    failed: parseInt(deployFreq.failed) || 0,
                    trend_percent: this.calculateTrend(deployFreqPerDay, prevDeployFreqPerDay),
                    level: this.classifyDoraLevel('deployment_frequency_per_day', deployFreqPerDay),
                },
                lead_time: {
                    avg_lead_time_hours: isNaN(avgLeadTime) ? null : avgLeadTime,
                    avg_cycle_time_hours: isNaN(avgCycleTime) ? null : avgCycleTime,
                    total_prs: parseInt(leadTime.total_prs) || 0,
                    prs_with_lead_time: parseInt(leadTime.prs_with_lead_time) || 0,
                    note: parseInt(leadTime.prs_without_lead_time) > 0
                        ? `${leadTime.prs_without_lead_time} PRs used cycle time as fallback`
                        : null,
                    level: this.classifyDoraLevel('lead_time_hours', avgLeadTime || avgCycleTime),
                },
                change_failure_rate: {
                    failure_rate_percent: failureRatePercent,
                    total_deployments: parseInt(failureRate.total_deployments) || 0,
                    failed_deployments: parseInt(failureRate.failed_deployments) || 0,
                    successful_deployments: parseInt(failureRate.successful_deployments) || 0,
                    level: this.classifyDoraLevel('failure_rate_percent', failureRatePercent),
                },
                mean_time_to_recovery: {
                    avg_mttr_hours: mttrHours,
                    incidents_recovered: parseInt(mttr?.incidents_recovered) || 0,
                    level: this.classifyDoraLevel('mttr_hours', mttrHours),
                },
                generated_at: new Date().toISOString(),
            };

            await cache.set(cacheKey, result, 1800);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getCycleTimeTrend(repoId, days = 90) {
        try {
            const cacheKey = `cycle_trend:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const result = await this.cycleRepo.getTrend(repoId, days);
            await cache.set(cacheKey, result, 600);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getCycleTimeSummary(repoId, days = 30) {
        try {
            const cacheKey = `cycle_summary:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const result = await this.cycleRepo.getSummary(repoId, days);
            await cache.set(cacheKey, result, 600);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getPrSizeAnalysis(repoId, days = 30) {
        try {
            const cacheKey = `pr_size:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const result = await this.cycleRepo.getByPrSize(repoId, days);
            await cache.set(cacheKey, result, 600);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getContributorLeaderboard(repoId, days = 30) {
        try {
            const cacheKey = `contributors:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const [authors, reviewers, commits] = await Promise.all([
                this.contributorRepo.getAuthorLeaderboard(repoId, days),
                this.contributorRepo.getReviewerLeaderboard(repoId, days),
                this.contributorRepo.getCommitFrequency(repoId, days),
            ]);

            const result = { authors, reviewers, commits };
            await cache.set(cacheKey, result, 600);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getReviewHeatmap(repoId, days = 90) {
        try {
            const cacheKey = `heatmap:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const result = await this.contributorRepo.getReviewHeatmap(repoId, days);
            await cache.set(cacheKey, result, 1800);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getContributorTrend(repoId, username, days = 90) {
        try {
            const cacheKey = `contributor_trend:repo_${repoId}:${username}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const result = await this.contributorRepo.getContributorTrend(
                repoId,
                username,
                days
            );
            await cache.set(cacheKey, result, 600);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getDeploymentFrequencyTrend(repoId, days = 84) {
        try {
            const cacheKey = `deploy_freq:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const result = await this.deploymentRepo.getFrequencyTrend(repoId, days);
            await cache.set(cacheKey, result, 1800);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getBuildDurationTrend(repoId, days = 84) {
        try {
            const cacheKey = `build_duration:repo_${repoId}:${days}days`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const [trend, summary] = await Promise.all([
                this.deploymentRepo.getBuildDurationTrend(repoId, days),
                this.deploymentRepo.getBuildDurationSummary(repoId, days),
            ]);

            const result = { trend, summary };
            await cache.set(cacheKey, result, 1800);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getRecentDeployments(repoId, limit = 15) {
        try {
            const cacheKey = `recent_deployments:repo_${repoId}`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const result = await this.deploymentRepo.getRecentDeployments(repoId, limit);
            await cache.set(cacheKey, result, 120);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async getOpenPrs(repoId) {
        try {
            const cacheKey = `open_prs:repo_${repoId}`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            const prs = await this.cycleRepo.getOpenPrsWaiting(repoId);

            const result = prs.map((pr) => ({
                ...pr,
                is_stale: parseFloat(pr.waiting_hours) > 48,
                is_critical: parseFloat(pr.waiting_hours) > 120,
                needs_review: parseInt(pr.review_count) === 0,
            }));

            await cache.set(cacheKey, result, 120);
            return result;
        } catch (e) {
            console.log('Something went wrong at the service layer', e);
            throw e;
        }
    }

    async invalidateRepoCache(repoId) {
        try {
            const patterns = [
                `dora:repo_${repoId}:*`,
                `cycle_trend:repo_${repoId}:*`,
                `cycle_summary:repo_${repoId}:*`,
                `pr_size:repo_${repoId}:*`,
                `contributors:repo_${repoId}:*`,
                `heatmap:repo_${repoId}:*`,
                `contributor_trend:repo_${repoId}:*`,
                `deploy_freq:repo_${repoId}:*`,
                `build_duration:repo_${repoId}:*`,
                `recent_deployments:repo_${repoId}`,
                `open_prs:repo_${repoId}`,
            ];

            await Promise.all(patterns.map((p) => cache.del(p)));
            console.log(`All cache cleared for repo ${repoId}`);
        } catch (e) {
            console.log('Cache invalidation error', e.message);
        }
    }
}

module.exports = { AnalyticsService };
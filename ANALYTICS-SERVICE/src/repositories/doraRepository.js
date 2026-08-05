const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class DoraRepository {
    async getDeploymentFrequency(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    COUNT(*) as total_deployments,
                    ROUND(COUNT(*) / :days, 4) as deployments_per_day,
                    ROUND(COUNT(*) / (:days / 7.0), 4) as deployments_per_week,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed
                FROM deployments
                WHERE repo_id = :repoId
                AND deployed_at > NOW() - INTERVAL :days DAY
                AND environment = 'production'
                AND completed_at IS NOT NULL
            `, {
                replacements: { repoId, days },
                type: QueryTypes.SELECT,
            });
            return result[0];
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getPreviousPeriodDeploymentFrequency(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    COUNT(*) as total_deployments,
                    ROUND(COUNT(*) / :days, 4) as deployments_per_day
                FROM deployments
                WHERE repo_id = :repoId
                AND deployed_at > NOW() - INTERVAL :doubleDays DAY
                AND deployed_at <= NOW() - INTERVAL :days DAY
                AND environment = 'production'
                AND completed_at IS NOT NULL
            `, {
                replacements: { repoId, days, doubleDays: days * 2 },
                type: QueryTypes.SELECT,
            });
            return result[0];
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getLeadTime(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    COUNT(*) as total_prs,
                    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
                    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_time_hours,
                    MIN(lead_time_hours) as min_lead_time_hours,
                    MAX(lead_time_hours) as max_lead_time_hours,
                    COUNT(CASE WHEN lead_time_hours IS NOT NULL THEN 1 END) as prs_with_lead_time,
                    COUNT(CASE WHEN lead_time_hours IS NULL THEN 1 END) as prs_without_lead_time
                FROM pull_requests
                WHERE repo_id = :repoId
                AND state = 'merged'
                AND pr_merged_at > NOW() - INTERVAL :days DAY
            `, {
                replacements: { repoId, days },
                type: QueryTypes.SELECT,
            });
            return result[0];
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getChangeFailureRate(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    COUNT(*) as total_deployments,
                    SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed_deployments,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_deployments,
                    ROUND(
                        SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) * 100.0
                        / NULLIF(COUNT(*), 0),
                        2
                    ) as failure_rate_percent
                FROM deployments
                WHERE repo_id = :repoId
                AND deployed_at > NOW() - INTERVAL :days DAY
                AND environment = 'production'
                AND completed_at IS NOT NULL
            `, {
                replacements: { repoId, days },
                type: QueryTypes.SELECT,
            });
            return result[0];
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getMeanTimeToRecovery(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    ROUND(AVG(
                        TIMESTAMPDIFF(MINUTE,
                            failed.completed_at,
                            next_success.deployed_at
                        ) / 60.0
                    ), 2) as avg_mttr_hours,
                    COUNT(*) as incidents_recovered
                FROM deployments failed
                JOIN deployments next_success
                    ON next_success.repo_id = failed.repo_id
                    AND next_success.environment = failed.environment
                    AND next_success.status = 'success'
                    AND next_success.deployed_at > failed.completed_at
                    AND next_success.deployed_at = (
                        SELECT MIN(d2.deployed_at)
                        FROM deployments d2
                        WHERE d2.repo_id = failed.repo_id
                        AND d2.environment = failed.environment
                        AND d2.status = 'success'
                        AND d2.deployed_at > failed.completed_at
                    )
                WHERE failed.repo_id = :repoId
                AND failed.status = 'failure'
                AND failed.completed_at > NOW() - INTERVAL :days DAY
                AND failed.completed_at IS NOT NULL
                AND failed.environment = 'production'
            `, {
                replacements: { repoId, days },
                type: QueryTypes.SELECT,
            });
            return result[0];
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }
}

module.exports = { DoraRepository };
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class DeploymentRepository {
    async getFrequencyTrend(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    YEARWEEK(deployed_at, 1) as year_week,
                    DATE(DATE_SUB(deployed_at,
                        INTERVAL WEEKDAY(deployed_at) DAY)) as week_start,
                    COUNT(*) as total_deployments,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed,
                    ROUND(
                        SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END)
                        * 100.0 / NULLIF(COUNT(*), 0),
                        2
                    ) as failure_rate_percent,
                    ROUND(AVG(build_duration_minutes), 2) as avg_build_minutes
                FROM deployments
                WHERE repo_id = :repoId
                AND deployed_at > NOW() - INTERVAL :days DAY
                AND environment = 'production'
                AND completed_at IS NOT NULL
                GROUP BY YEARWEEK(deployed_at, 1), week_start
                ORDER BY year_week ASC
            `, {
                replacements: { repoId, days },
                type: QueryTypes.SELECT,
            });
            return result;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getBuildDurationTrend(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    YEARWEEK(deployed_at, 1) as year_week,
                    DATE(DATE_SUB(deployed_at,
                        INTERVAL WEEKDAY(deployed_at) DAY)) as week_start,
                    COUNT(*) as total_deployments,
                    ROUND(AVG(build_duration_minutes), 2) as avg_build_minutes,
                    ROUND(MIN(build_duration_minutes), 2) as fastest_build_minutes,
                    ROUND(MAX(build_duration_minutes), 2) as slowest_build_minutes,
                    ROUND(AVG(build_duration_minutes) OVER (
                        ORDER BY YEARWEEK(deployed_at, 1)
                        ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
                    ), 2) as rolling_4week_avg_minutes
                FROM deployments
                WHERE repo_id = :repoId
                AND deployed_at > NOW() - INTERVAL :days DAY
                AND environment = 'production'
                AND completed_at IS NOT NULL
                AND build_duration_minutes IS NOT NULL
                GROUP BY YEARWEEK(deployed_at, 1), week_start
                ORDER BY year_week ASC
            `, {
                replacements: { repoId, days },
                type: QueryTypes.SELECT,
            });
            return result;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getRecentDeployments(repoId, limit = 15) {
        try {
            const result = await sequelize.query(`
                SELECT
                    id,
                    environment,
                    status,
                    sha,
                    deployed_by_username,
                    deployed_at,
                    completed_at,
                    build_duration_minutes,
                    ROUND(
                        TIMESTAMPDIFF(MINUTE, deployed_at, NOW()) / 60.0,
                        1
                    ) as hours_ago
                FROM deployments
                WHERE repo_id = :repoId
                ORDER BY deployed_at DESC
                LIMIT :limit
            `, {
                replacements: { repoId, limit },
                type: QueryTypes.SELECT,
            });
            return result;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getBuildDurationSummary(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    COUNT(*) as total_deployments,
                    ROUND(AVG(build_duration_minutes), 2) as avg_build_minutes,
                    ROUND(MIN(build_duration_minutes), 2) as fastest_build_minutes,
                    ROUND(MAX(build_duration_minutes), 2) as slowest_build_minutes,
                    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed
                FROM deployments
                WHERE repo_id = :repoId
                AND deployed_at > NOW() - INTERVAL :days DAY
                AND environment = 'production'
                AND completed_at IS NOT NULL
                AND build_duration_minutes IS NOT NULL
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

module.exports = { DeploymentRepository };
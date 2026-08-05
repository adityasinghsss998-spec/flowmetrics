const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class CycleTimeRepository {
    async getTrend(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    YEARWEEK(pr_merged_at, 1) as year_week,
                    DATE(DATE_SUB(pr_merged_at,
                        INTERVAL WEEKDAY(pr_merged_at) DAY)) as week_start,
                    COUNT(*) as pr_count,
                    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_hours,
                    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
                    ROUND(MIN(cycle_time_hours), 2) as min_cycle_hours,
                    ROUND(MAX(cycle_time_hours), 2) as max_cycle_hours,
                    COUNT(CASE WHEN lead_time_hours IS NOT NULL THEN 1 END)
                        as prs_with_lead_time
                FROM pull_requests
                WHERE repo_id = :repoId
                AND state = 'merged'
                AND pr_merged_at > NOW() - INTERVAL :days DAY
                AND cycle_time_hours IS NOT NULL
                GROUP BY YEARWEEK(pr_merged_at, 1), week_start
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

    async getByPrSize(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    CASE
                        WHEN (additions + deletions) < 50 THEN 'small'
                        WHEN (additions + deletions) < 200 THEN 'medium'
                        WHEN (additions + deletions) < 500 THEN 'large'
                        ELSE 'xlarge'
                    END as size_bucket,
                    COUNT(*) as pr_count,
                    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_hours,
                    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
                    ROUND(MIN(cycle_time_hours), 2) as min_cycle_hours,
                    ROUND(MAX(cycle_time_hours), 2) as max_cycle_hours,
                    ROUND(AVG(additions + deletions), 0) as avg_lines_changed
                FROM pull_requests
                WHERE repo_id = :repoId
                AND state = 'merged'
                AND pr_merged_at > NOW() - INTERVAL :days DAY
                AND cycle_time_hours IS NOT NULL
                GROUP BY size_bucket
                ORDER BY
                    CASE size_bucket
                        WHEN 'small' THEN 1
                        WHEN 'medium' THEN 2
                        WHEN 'large' THEN 3
                        WHEN 'xlarge' THEN 4
                    END
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

    async getOpenPrsWaiting(repoId) {
        try {
            const result = await sequelize.query(`
                SELECT
                    pr.id,
                    pr.number,
                    pr.title,
                    pr.author_username,
                    pr.additions,
                    pr.deletions,
                    pr.changed_files,
                    pr.pr_opened_at,
                    pr.first_review_at,
                    ROUND(
                        TIMESTAMPDIFF(MINUTE, pr.pr_opened_at, NOW()) / 60.0,
                        1
                    ) as waiting_hours,
                    ROUND(
                        TIMESTAMPDIFF(MINUTE, pr.pr_opened_at, pr.first_review_at) / 60.0,
                        1
                    ) as time_to_first_review_hours,
                    COUNT(r.id) as review_count,
                    MAX(r.submitted_at) as last_review_at,
                    GROUP_CONCAT(DISTINCT r.reviewer_username) as reviewers
                FROM pull_requests pr
                LEFT JOIN pr_reviews r ON r.pr_id = pr.id
                WHERE pr.repo_id = :repoId
                AND pr.state = 'open'
                GROUP BY
                    pr.id, pr.number, pr.title,
                    pr.author_username, pr.additions,
                    pr.deletions, pr.changed_files,
                    pr.pr_opened_at, pr.first_review_at
                ORDER BY pr.pr_opened_at ASC
            `, {
                replacements: { repoId },
                type: QueryTypes.SELECT,
            });
            return result;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getSummary(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    COUNT(*) as total_prs_merged,
                    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_hours,
                    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
                    ROUND(
                        AVG(TIMESTAMPDIFF(MINUTE, pr_opened_at, first_review_at) / 60.0),
                        2
                    ) as avg_time_to_first_review_hours,
                    ROUND(MIN(cycle_time_hours), 2) as fastest_merge_hours,
                    ROUND(MAX(cycle_time_hours), 2) as slowest_merge_hours,
                    ROUND(AVG(additions + deletions), 0) as avg_pr_size_lines,
                    ROUND(AVG(commits_count), 1) as avg_commits_per_pr
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
}

module.exports = { CycleTimeRepository };
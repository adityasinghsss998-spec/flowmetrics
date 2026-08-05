const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class ContributorRepository {
    async getAuthorLeaderboard(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    author_username,
                    COUNT(*) as prs_merged,
                    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_hours,
                    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
                    ROUND(MIN(cycle_time_hours), 2) as fastest_pr_hours,
                    ROUND(MAX(cycle_time_hours), 2) as slowest_pr_hours,
                    SUM(additions + deletions) as total_lines_changed,
                    ROUND(AVG(additions + deletions), 0) as avg_pr_size,
                    ROUND(AVG(commits_count), 1) as avg_commits_per_pr,
                    SUM(commits_count) as total_commits
                FROM pull_requests
                WHERE repo_id = :repoId
                AND state = 'merged'
                AND pr_merged_at > NOW() - INTERVAL :days DAY
                GROUP BY author_username
                ORDER BY prs_merged DESC
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

    async getReviewerLeaderboard(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    r.reviewer_username,
                    COUNT(r.id) as total_reviews,
                    COUNT(DISTINCT r.pr_id) as unique_prs_reviewed,
                    SUM(CASE WHEN r.state = 'approved' THEN 1 ELSE 0 END)
                        as approvals,
                    SUM(CASE WHEN r.state = 'changes_requested' THEN 1 ELSE 0 END)
                        as change_requests,
                    SUM(CASE WHEN r.state = 'commented' THEN 1 ELSE 0 END)
                        as comments,
                    ROUND(
                        AVG(TIMESTAMPDIFF(MINUTE, pr.pr_opened_at, r.submitted_at))
                        / 60.0,
                        2
                    ) as avg_review_turnaround_hours,
                    ROUND(
                        MIN(TIMESTAMPDIFF(MINUTE, pr.pr_opened_at, r.submitted_at))
                        / 60.0,
                        2
                    ) as fastest_review_hours
                FROM pr_reviews r
                JOIN pull_requests pr ON pr.id = r.pr_id
                WHERE r.repo_id = :repoId
                AND r.submitted_at > NOW() - INTERVAL :days DAY
                GROUP BY r.reviewer_username
                ORDER BY total_reviews DESC
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

    async getReviewHeatmap(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    DAYOFWEEK(r.submitted_at) as day_of_week,
                    DAYNAME(r.submitted_at) as day_name,
                    HOUR(r.submitted_at) as hour_of_day,
                    COUNT(r.id) as review_count,
                    ROUND(
                        AVG(
                            TIMESTAMPDIFF(MINUTE, pr.pr_opened_at, r.submitted_at)
                        ) / 60.0,
                        2
                    ) as avg_turnaround_hours
                FROM pr_reviews r
                JOIN pull_requests pr ON pr.id = r.pr_id
                WHERE r.repo_id = :repoId
                AND r.submitted_at > NOW() - INTERVAL :days DAY
                GROUP BY
                    DAYOFWEEK(r.submitted_at),
                    DAYNAME(r.submitted_at),
                    HOUR(r.submitted_at)
                ORDER BY day_of_week, hour_of_day
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

    async getContributorTrend(repoId, username, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    YEARWEEK(pr_merged_at, 1) as year_week,
                    DATE(DATE_SUB(pr_merged_at,
                        INTERVAL WEEKDAY(pr_merged_at) DAY)) as week_start,
                    COUNT(*) as prs_merged,
                    ROUND(AVG(cycle_time_hours), 2) as avg_cycle_hours,
                    ROUND(AVG(lead_time_hours), 2) as avg_lead_time_hours,
                    SUM(additions + deletions) as lines_changed,
                    SUM(commits_count) as total_commits
                FROM pull_requests
                WHERE repo_id = :repoId
                AND author_username = :username
                AND state = 'merged'
                AND pr_merged_at > NOW() - INTERVAL :days DAY
                GROUP BY YEARWEEK(pr_merged_at, 1), week_start
                ORDER BY year_week ASC
            `, {
                replacements: { repoId, username, days },
                type: QueryTypes.SELECT,
            });
            return result;
        } catch (e) {
            console.log('Something went wrong at the repo layer', e);
            throw e;
        }
    }

    async getCommitFrequency(repoId, days) {
        try {
            const result = await sequelize.query(`
                SELECT
                    author_username,
                    COUNT(*) as total_commits,
                    COUNT(DISTINCT DATE(committed_at)) as active_days,
                    ROUND(COUNT(*) / :days, 2) as commits_per_day,
                    ROUND(COUNT(*) / (:days / 7.0), 2) as commits_per_week,
                    MIN(committed_at) as first_commit_at,
                    MAX(committed_at) as last_commit_at
                FROM commits
                WHERE repo_id = :repoId
                AND committed_at > NOW() - INTERVAL :days DAY
                AND author_username IS NOT NULL
                GROUP BY author_username
                ORDER BY total_commits DESC
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
}

module.exports = { ContributorRepository };
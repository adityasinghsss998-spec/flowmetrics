const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class PullRequest extends Model {}

    PullRequest.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        github_pr_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        repo_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        number: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        author_github_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        author_username: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        state: {
            type: DataTypes.ENUM('open', 'closed', 'merged'),
            defaultValue: 'open',
        },
        base_branch: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        head_branch: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        additions: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        deletions: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        changed_files: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        commits_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        review_comments_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        cycle_time_hours: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        first_review_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        pr_opened_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        pr_merged_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        pr_closed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        sequelize,
        modelName: 'PullRequest',
        tableName: 'pull_requests',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    return PullRequest;
};
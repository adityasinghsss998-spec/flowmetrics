'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('pull_requests', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            github_pr_id: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            repo_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'repositories', key: 'id' },
                onDelete: 'CASCADE',
            },
            number: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            title: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            author_github_id: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            author_username: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            state: {
                type: Sequelize.ENUM('open', 'closed', 'merged'),
                defaultValue: 'open',
            },
            base_branch: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            head_branch: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            additions: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            deletions: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            changed_files: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            commits_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            review_comments_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            cycle_time_hours: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            first_review_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            pr_opened_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            pr_merged_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            pr_closed_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        await queryInterface.addIndex('pull_requests', ['repo_id']);
        await queryInterface.addIndex('pull_requests', ['author_github_id']);
        await queryInterface.addIndex('pull_requests', ['state']);
        await queryInterface.addIndex('pull_requests', ['pr_opened_at']);
        await queryInterface.addIndex('pull_requests', ['pr_merged_at']);
        await queryInterface.addIndex('pull_requests', ['repo_id', 'number'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('pull_requests');
    },
};
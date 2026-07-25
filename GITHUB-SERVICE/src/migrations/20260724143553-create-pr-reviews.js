'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('pr_reviews', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            github_review_id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                unique: true,
            },
            pr_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'pull_requests', key: 'id' },
                onDelete: 'CASCADE',
            },
            repo_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'repositories', key: 'id' },
                onDelete: 'CASCADE',
            },
            reviewer_github_id: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            reviewer_username: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            state: {
                type: Sequelize.ENUM('approved', 'changes_requested', 'commented', 'dismissed'),
                allowNull: false,
            },
            submitted_at: {
                type: Sequelize.DATE,
                allowNull: false,
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

        await queryInterface.addIndex('pr_reviews', ['pr_id']);
        await queryInterface.addIndex('pr_reviews', ['repo_id']);
        await queryInterface.addIndex('pr_reviews', ['reviewer_github_id']);
        await queryInterface.addIndex('pr_reviews', ['submitted_at']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('pr_reviews');
    },
};
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('commits', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            sha: {
                type: Sequelize.STRING(40),
                allowNull: false,
            },
            repo_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'repositories', key: 'id' },
                onDelete: 'CASCADE',
            },
            pr_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'pull_requests', key: 'id' },
                onDelete: 'SET NULL',
            },
            author_github_id: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            author_username: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            message: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            additions: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            deletions: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
            },
            committed_at: {
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

        await queryInterface.addIndex('commits', ['repo_id']);
        await queryInterface.addIndex('commits', ['pr_id']);
        await queryInterface.addIndex('commits', ['author_github_id']);
        await queryInterface.addIndex('commits', ['committed_at']);
        await queryInterface.addIndex('commits', ['sha', 'repo_id'], { unique: true });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('commits');
    },
};
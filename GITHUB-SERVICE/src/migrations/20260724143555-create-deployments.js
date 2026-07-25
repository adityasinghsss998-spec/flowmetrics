'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('deployments', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            github_deployment_id: {
                type: Sequelize.BIGINT,
                allowNull: true,
                unique: true,
            },
            repo_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'repositories', key: 'id' },
                onDelete: 'CASCADE',
            },
            environment: {
                type: Sequelize.STRING(100),
                defaultValue: 'production',
            },
            status: {
                type: Sequelize.ENUM('success', 'failure', 'pending', 'in_progress'),
                defaultValue: 'pending',
            },
            sha: {
                type: Sequelize.STRING(40),
                allowNull: true,
            },
            deployed_by_username: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            lead_time_hours: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
            },
            deployed_at: {
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

        await queryInterface.addIndex('deployments', ['repo_id']);
        await queryInterface.addIndex('deployments', ['deployed_at']);
        await queryInterface.addIndex('deployments', ['status']);
        await queryInterface.addIndex('deployments', ['environment']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('deployments');
    },
};
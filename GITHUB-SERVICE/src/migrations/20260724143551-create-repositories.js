'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('repositories', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            github_repo_id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                unique: true,
            },
            org_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            owner_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            full_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            default_branch: {
                type: Sequelize.STRING(100),
                defaultValue: 'main',
            },
            is_private: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
            },
            webhook_id: {
                type: Sequelize.BIGINT,
                allowNull: true,
            },
            last_synced_at: {
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

        await queryInterface.addIndex('repositories', ['github_repo_id']);
        await queryInterface.addIndex('repositories', ['org_id']);
        await queryInterface.addIndex('repositories', ['owner_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('repositories');
    },
};
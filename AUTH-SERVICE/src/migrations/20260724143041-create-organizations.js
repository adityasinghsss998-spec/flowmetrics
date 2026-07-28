'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('organizations', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            slug: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            github_org_name: {
                type: Sequelize.STRING(100),
                allowNull: true,
            },
            owner_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
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

        await queryInterface.addIndex('organizations', ['slug']);
        await queryInterface.addIndex('organizations', ['owner_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('organizations');
    },
};
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('deployments');

        if (!table.completed_at) {
            await queryInterface.addColumn('deployments', 'completed_at', {
                type: Sequelize.DATE,
                allowNull: true,
                after: 'deployed_at',
            });
        }

        if (!table.build_duration_minutes) {
            await queryInterface.addColumn('deployments', 'build_duration_minutes', {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                after: 'completed_at',
            });
        }

        await queryInterface.addIndex('deployments', ['completed_at']);
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('deployments', ['completed_at']);
        await queryInterface.removeColumn('deployments', 'completed_at');
        await queryInterface.removeColumn('deployments', 'build_duration_minutes');
    },
};
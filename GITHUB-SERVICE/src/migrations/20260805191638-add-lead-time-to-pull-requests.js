'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('pull_requests', 'lead_time_hours', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            after: 'cycle_time_hours',
        });

        await queryInterface.addIndex('pull_requests', ['lead_time_hours']);
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('pull_requests', 'lead_time_hours');
    },
};
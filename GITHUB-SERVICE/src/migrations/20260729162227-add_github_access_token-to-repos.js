'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('repositories','github_access_token',{
      type:Sequelize.TEXT,
      allowNull:true,
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('repos', 'github_access_token');
  }
}; 

'use strict';

module.exports = { 
  async up(queryInterface, Sequelize) {
     await queryInterface.createTable('users',{
         id:{
           type:Sequelize.INTEGER,
           autoIncrement:true,
           primaryKey:true,
           allowNull:false,
         },
         name : {
          type:Sequelize.STRING(100),
          allowNull:false,
         },
         email :{
          type:Sequelize.STRING(255),
          allowNull:false,
          unique:true,
         },
         password : {
          type:Sequelize.STRING(255),
          allowNull:true,
         },

         github_id: {
          type:Sequelize.BIGINT,
          allowNull:true,
          unique:true
         },

         github_access_token:{
          type:Sequelize.TEXT,
          allowNull:true,
         }, 

         github_username : {
          type:Sequelize.STRING(255),
          allowNull:true,
         },

          refresh_token : {
            type:Sequelize.TEXT,
            allowNull:true,
          },

          avatar_url : {
            type:Sequelize.TEXT,
            allowNull:false,
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

     await queryInterface.addIndex('users',['email']);
     await queryInterface.addIndex('users',['github_id']);
  }, 
 
  async down(queryInterface,Sequelize) {
    await queryInterface.dropTable('users');
  }
};

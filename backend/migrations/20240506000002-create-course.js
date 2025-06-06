'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Courses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false
      },
      department: {
        type: Sequelize.STRING,
        allowNull: false
      },
      semester: {
        type: Sequelize.STRING,
        allowNull: false
      },
      credits: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      isElective: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      offeringDepartment: {
        type: Sequelize.STRING,
        allowNull: true
      },
      peGroupId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      oeGroupId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Courses');
  }
}; 
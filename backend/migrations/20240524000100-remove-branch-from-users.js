'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the branch column if it exists
    return queryInterface.removeColumn('Users', 'branch').catch(() => {});
  },
  async down(queryInterface, Sequelize) {
    // Optionally add the branch column back if needed
    return queryInterface.addColumn('Users', 'branch', {
      type: Sequelize.STRING,
      allowNull: true
    }).catch(() => {});
  }
}; 
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the table if it exists
    await queryInterface.dropTable('StudentElectives').catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    // No down migration needed since we're removing the table
  }
}; 
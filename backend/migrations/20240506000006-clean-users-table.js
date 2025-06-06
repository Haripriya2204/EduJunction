'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  },

  async down(queryInterface, Sequelize) {
    // No down migration needed as we're just cleaning data
  }
}; 
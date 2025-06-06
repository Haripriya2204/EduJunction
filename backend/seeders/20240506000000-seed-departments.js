'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('departments', null, {}); // Clear existing data for idempotency
    try {
      await queryInterface.bulkInsert('departments', [
        { name: 'Computer Science and Engineering', createdAt: new Date(), updatedAt: new Date() },
        { name: 'Computer Science and Engineering - Artificial Intelligence and Machine Learning', createdAt: new Date(), updatedAt: new Date() },
        { name: 'Computer Science and Engineering - Cyber Security', createdAt: new Date(), updatedAt: new Date() },
        { name: 'Aeronautical', createdAt: new Date(), updatedAt: new Date() }
      ]);
    } catch (e) {
      console.error("Sequelize error (full) in departments seeder:", e);
      throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('departments', null, {});
  }
}; 
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Actual elective courses for CSE department
    const courses = [
      {
        name: 'Professional Elective 1',
        code: 'PE1',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 3,
        isElective: true,
        category: 'PE',
        peGroupId: 1,
        oeGroupId: null,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Professional Elective 2',
        code: 'PE2',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 3,
        isElective: true,
        category: 'PE',
        peGroupId: 2,
        oeGroupId: null,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Open Elective 1',
        code: 'OE1',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 3,
        isElective: true,
        category: 'OE',
        peGroupId: null,
        oeGroupId: 1,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Open Elective 2',
        code: 'OE2',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 3,
        isElective: true,
        category: 'OE',
        peGroupId: null,
        oeGroupId: 2,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkDelete('courses', { isElective: true }, {});
    await queryInterface.bulkInsert('courses', courses, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('courses', null, {});
  }
}; 
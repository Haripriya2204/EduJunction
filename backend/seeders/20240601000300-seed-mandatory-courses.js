'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Actual mandatory courses for CSE department
    const courses = [
      {
        name: 'Introduction to Artificial Intelligence',
        code: 'A6IT39',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 3,
        isElective: false,
        category: 'Core',
        peGroupId: null,
        oeGroupId: null,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Automata and Compiler Design',
        code: 'A6IT11',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 3,
        isElective: false,
        category: 'Core',
        peGroupId: null,
        oeGroupId: null,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Data Mining and Machine Learning',
        code: 'A6CS16',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 3,
        isElective: false,
        category: 'Core',
        peGroupId: null,
        oeGroupId: null,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Data Mining and Machine Learning Lab',
        code: 'A6CS17',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 1.5,
        isElective: false,
        category: 'Core',
        peGroupId: null,
        oeGroupId: null,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Industry Oriented Mini Project/Internship',
        code: 'A6CS21',
        department: 'Computer Science and Engineering',
        semester: '6',
        credits: 2,
        isElective: false,
        category: 'Core',
        peGroupId: null,
        oeGroupId: null,
        offeringDepartment: 'Computer Science and Engineering',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Delete only mandatory courses, not elective placeholders
    await queryInterface.bulkDelete('Courses', { 
      isElective: false,
      category: 'Core'
    }, {});
    
    await queryInterface.bulkInsert('Courses', courses, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Courses', null, {});
  }
}; 
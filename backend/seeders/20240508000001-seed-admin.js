'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Fetch departments to map names to IDs
    const departments = await queryInterface.sequelize.query(
      'SELECT id, name FROM departments;',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const deptMap = {};
    departments.forEach(d => { deptMap[d.name] = d.id; });
    const admins = [
      {
        username: 'admin1',
        name: 'admin1',
        password: 'admin11',
        department: 'Computer Science and Engineering',
        role: 'admin',
        email: 'admin1@mlrit.ac.in',
        rollNo: 'admin1',
        semester: null,
        mobileNumber: null,
        position: 'Admin',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'admin2',
        name: 'admin2',
        password: 'admin22',
        department: 'Computer Science and Engineering - Artificial Intelligence and Machine Learning',
        role: 'admin',
        email: 'admin2@mlrit.ac.in',
        rollNo: 'admin2',
        semester: null,
        mobileNumber: null,
        position: 'Admin',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'admin3',
        name: 'admin3',
        password: 'admin33',
        department: 'Computer Science and Engineering - Cyber Security',
        role: 'admin',
        email: 'admin3@mlrit.ac.in',
        rollNo: 'admin3',
        semester: null,
        mobileNumber: null,
        position: 'Admin',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'admin4',
        name: 'admin4',
        password: 'admin44',
        department: 'Aeronautical',
        role: 'admin',
        email: 'admin4@mlrit.ac.in',
        rollNo: 'admin4',
        semester: null,
        mobileNumber: null,
        position: 'Admin',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    // Assign departmentId to each admin
    admins.forEach(a => {
      a.departmentId = deptMap[a.department];
    });
    await queryInterface.bulkInsert('users', admins, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { role: 'admin' }, {});
  }
}; 
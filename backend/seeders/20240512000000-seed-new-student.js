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

    const student = {
      username: '22R21A0503',
      name: 'ALETI POOJITHA',
      password: '22R21A0503',
      department: 'Computer Science and Engineering',
      role: 'student',
      email: '22R21A0503@mlrit.ac.in',
      rollNo: '22R21A0503',
      semester: '6',
      mobileNumber: '9000000009', // Following the pattern from other students
      position: '',
      profilePicture: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log(student);

    // Assign departmentId to the student
    student.departmentId = deptMap[student.department];
    if (!student.departmentId) {
      console.error('Department not found for:', student.name, student.department);
      throw new Error(`Department not found for student: ${student.name} (${student.department})`);
    }

    // Delete any existing student (or user) record with the same username to avoid duplicate entry errors
    await queryInterface.bulkDelete('users', { username: student.username }, {});

    try {
      await queryInterface.bulkInsert('users', [student], {});
    } catch (e) {
      console.error("Sequelize error (full):", e);
      throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { username: '22R21A0503' }, {});
  }
}; 
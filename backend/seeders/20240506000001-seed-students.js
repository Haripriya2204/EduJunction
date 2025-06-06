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
    console.log('DEBUG: deptMap', deptMap);
    const students = [
      // CSM Department
      {
        username: '22R21A66D8',
        name: 'BOLLEPALLI ABHILASH',
        password: '22R21A66D8',
        department: 'Computer Science and Engineering - Artificial Intelligence and Machine Learning',
        role: 'student',
        email: '22R21A66D8@mlrit.ac.in',
        rollNo: '22R21A66D8',
        semester: '6',
        mobileNumber: '9000000001',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: '22R21A66E2',
        name: 'CHINTHAPOOLA SHASHANK',
        password: '22R21A66E2',
        department: 'Computer Science and Engineering - Artificial Intelligence and Machine Learning',
        role: 'student',
        email: '22R21A66E2@mlrit.ac.in',
        rollNo: '22R21A66E2',
        semester: '6',
        mobileNumber: '9000000002',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // CSC Department
      {
        username: '22R21A6201',
        name: 'AKULA RAMYA',
        password: '22R21A6201',
        department: 'Computer Science and Engineering - Cyber Security',
        role: 'student',
        email: '22R21A6201@mlrit.ac.in',
        rollNo: '22R21A6201',
        semester: '6',
        mobileNumber: '9000000003',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: '22R21A6202',
        name: 'ALLURI POOJA',
        password: '22R21A6202',
        department: 'Computer Science and Engineering - Cyber Security',
        role: 'student',
        email: '22R21A6202@mlrit.ac.in',
        rollNo: '22R21A6202',
        semester: '6',
        mobileNumber: '9000000004',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // AERO Department
      {
        username: '22R21A2101',
        name: 'AILA VINAY TEJA',
        password: '22R21A2101',
        department: 'Aeronautical',
        role: 'student',
        email: '22R21A2101@mlrit.ac.in',
        rollNo: '22R21A2101',
        semester: '6',
        mobileNumber: '9000000005',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: '22R21A2102',
        name: 'ANURAGH MUKHERJEE',
        password: '22R21A2102',
        department: 'Aeronautical',
        role: 'student',
        email: '22R21A2102@mlrit.ac.in',
        rollNo: '22R21A2102',
        semester: '6',
        mobileNumber: '9000000006',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // CSE Department
      {
        username: '22R21A0501',
        name: 'ADDAGARLA KOUSHIK RAM',
        password: '22R21A0501',
        department: 'Computer Science and Engineering',
        role: 'student',
        email: '22R21A0501@mlrit.ac.in',
        rollNo: '22R21A0501',
        semester: '6',
        mobileNumber: '9000000007',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: '22R21A0502',
        name: 'AGRIMA MAHARANA',
        password: '22R21A0502',
        department: 'Computer Science and Engineering',
        role: 'student',
        email: '22R21A0502@mlrit.ac.in',
        rollNo: '22R21A0502',
        semester: '6',
        mobileNumber: '9000000008',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // New student added
      {
        username: '22R21A0503',
        name: 'ALETI POOJITHA',
        password: '22R21A0503',
        department: 'Computer Science and Engineering',
        role: 'student',
        email: '22R21A0503@mlrit.ac.in',
        rollNo: '22R21A0503',
        semester: '6',
        mobileNumber: '9000000009',
        position: '',
        profilePicture: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    // Assign departmentId to each student
    students.forEach(s => {
      console.log('DEBUG: student', s.name, '| department:', s.department);
      s.departmentId = deptMap[s.department];
      if (!s.departmentId) {
        console.error('Department not found for:', s.name, s.department);
        throw new Error(`Department not found for student: ${s.name} (${s.department})`);
      }
    });
    // Delete any existing student (or user) record with the same username (or email) to avoid duplicate entry errors.
    const usernames = students.map(s => s.username);
    await queryInterface.bulkDelete('users', { username: { [Sequelize.Op.in]: usernames } }, {});
    try {
      await queryInterface.bulkInsert('users', students, {});
    } catch (e) {
      console.error("Sequelize error (full):", e);
      throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
}; 
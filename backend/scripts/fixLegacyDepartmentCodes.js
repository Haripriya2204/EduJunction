const { User, Course, Department } = require('../src/models');

const codeMap = {
  'Computer Science and Engineering': 'CSE',
  'Computer Science and Engineering - Artificial Intelligence and Machine Learning': 'CSM',
  'Computer Science and Engineering - Cyber Security': 'CSC',
  'Aeronautical': 'Aeronautical',
};

async function run() {
  // Update Users
  for (const [full, code] of Object.entries(codeMap)) {
    await User.update({ department: code }, { where: { department: full } });
  }
  // Update Courses
  for (const [full, code] of Object.entries(codeMap)) {
    await Course.update({ department: code }, { where: { department: full } });
  }
  // Update Departments
  for (const [full, code] of Object.entries(codeMap)) {
    await Department.update({ deptCode: code }, { where: { name: full } });
  }
  console.log('Legacy department codes fixed.');
}

run().then(() => process.exit(0)); 
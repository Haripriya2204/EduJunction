const { User, FeeReceipt, Course } = require('./src/models');

async function checkData() {
  try {
    console.log('=== CHECKING USER 19 SPECIFICALLY ===');
    const user19 = await User.findByPk(19);
    console.log('User 19:', {
      id: user19.id,
      name: user19.name,
      department: user19.department,
      semester: user19.semester
    });

    const receipt19 = await FeeReceipt.findOne({
      where: { userId: 19, status: 'approved' },
      order: [['createdAt', 'DESC']]
    });
    console.log('User 19 approved receipt:', receipt19 ? {
      id: receipt19.id,
      semester: receipt19.semester,
      status: receipt19.status
    } : 'None');

    console.log('\n=== TESTING MANDATORY COURSES QUERY FOR USER 19 ===');
    if (receipt19) {
      console.log(`Searching for courses with department: "${user19.department}" and semester: "${receipt19.semester}"`);
      
      const mandatoryCourses = await Course.findAll({
        where: {
          department: user19.department,
          semester: receipt19.semester,
          isElective: false
        },
        attributes: ['id', 'code', 'name', 'credits', 'department', 'semester']
      });
      console.log('Found mandatory courses:', mandatoryCourses.length);
      
      if (mandatoryCourses.length === 0) {
        console.log('\n=== CHECKING DEPARTMENT MISMATCH ===');
        console.log('User department:', user19.department);
        
        const allDepartments = await Course.findAll({
          attributes: ['department'],
          group: ['department'],
          raw: true
        });
        console.log('Available course departments:', allDepartments.map(d => d.department));
        
        // Try with CSE department
        const cseCoursesForSem6 = await Course.findAll({
          where: {
            department: 'CSE',
            semester: receipt19.semester,
            isElective: false
          },
          attributes: ['id', 'code', 'name', 'credits']
        });
        console.log(`CSE courses for semester ${receipt19.semester}:`, cseCoursesForSem6.length);
        cseCoursesForSem6.slice(0, 5).forEach(course => {
          console.log(`  ${course.code} - ${course.name}`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData(); 
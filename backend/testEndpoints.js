const { User, FeeReceipt, Course, StudentElective } = require('./src/models');

async function testEndpoints() {
  try {
    console.log('=== TESTING MANDATORY COURSES ENDPOINT LOGIC ===');
    const userId = 19;
    
    // Simulate the getMandatoryCourses logic
    const receipt = await FeeReceipt.findOne({
      where: { userId, status: 'approved' },
      order: [['createdAt', 'DESC']]
    });
    
    if (!receipt || !receipt.semester) {
      console.log('No approved fee receipt or semester for userId', userId);
      return;
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('No user found for userId', userId);
      return;
    }
    
    console.log('User department:', user.department);
    console.log('Receipt semester:', receipt.semester);
    
    // Fetch mandatory courses
    let courses = await Course.findAll({
      where: {
        department: user.department,
        semester: receipt.semester,
        isElective: false
      },
      attributes: ['id', 'code', 'name', 'credits', 'department', 'semester']
    });
    
    console.log('Found mandatory courses:', courses.length);
    courses.forEach(course => {
      console.log(`  ${course.code} - ${course.name} (${course.credits} credits)`);
    });
    
    console.log('\n=== TESTING ELECTIVES STATUS ENDPOINT LOGIC ===');
    
    // Test electives status logic
    const semester = receipt.semester;
    
    // Check if user exists
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Get all saved selections for this student and semester
    const selections = await StudentElective.findAll({
      where: {
        userId,
        semester,
        isSaved: true
      },
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'name', 'credits', 'peGroupId', 'oeGroupId', 'category']
      }]
    });
    
    console.log('Found saved elective selections:', selections.length);
    
    // Get available electives for this student
    const availableElectives = await Course.findAll({
      where: {
        department: user.department,
        semester,
        isElective: true,
        category: ['PE', 'OE']
      },
      order: [
        ['peGroupId', 'ASC'],
        ['oeGroupId', 'ASC'],
        ['code', 'ASC']
      ]
    });
    
    console.log('Found available electives:', availableElectives.length);
    availableElectives.slice(0, 5).forEach(course => {
      console.log(`  ${course.code} - ${course.name} (Group: PE-${course.peGroupId || 'N/A'}, OE-${course.oeGroupId || 'N/A'})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEndpoints(); 
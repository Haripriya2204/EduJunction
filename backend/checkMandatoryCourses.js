const { Course } = require('./src/models');

async function checkMandatoryCourses() {
  try {
    console.log('=== CHECKING MANDATORY COURSES FOR SEMESTER 6 ===');
    
    const mandatoryCourses = await Course.findAll({
      where: {
        department: 'Computer Science and Engineering',
        semester: '6',
        isElective: false
      },
      attributes: ['id', 'code', 'name', 'credits'],
      order: [['code', 'ASC']]
    });
    
    console.log(`Found ${mandatoryCourses.length} mandatory courses:`);
    mandatoryCourses.forEach(course => {
      console.log(`  ${course.code} - ${course.name} (${course.credits} credits)`);
    });
    
    console.log('\n=== CHECKING ALL COURSES FOR SEMESTER 6 ===');
    
    const allCourses = await Course.findAll({
      where: {
        department: 'Computer Science and Engineering',
        semester: '6'
      },
      attributes: ['id', 'code', 'name', 'credits', 'isElective', 'category'],
      order: [['isElective', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`Found ${allCourses.length} total courses:`);
    allCourses.forEach(course => {
      const type = course.isElective ? 'ELECTIVE' : 'MANDATORY';
      const category = course.category ? `[${course.category}]` : '';
      console.log(`  ${type}: ${course.code} - ${course.name} (${course.credits} credits) ${category}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMandatoryCourses(); 
const { Course } = require('./src/models');

async function updateSem6Courses() {
  try {
    console.log('=== UPDATING SEMESTER 6 COURSES ===');
    
    const courseUpdates = [
      { code: 'A6CS11', name: 'Software Engineering', department: 'Computer Science and Engineering' },
      { code: 'A6CS12', name: 'Computer Networks', department: 'Computer Science and Engineering' },
      { code: 'A6CS13', name: 'Database Management Systems', department: 'Computer Science and Engineering' },
      { code: 'A6CS14', name: 'Operating Systems', department: 'Computer Science and Engineering' },
      { code: 'A6CS15', name: 'Web Technologies Lab', department: 'Computer Science and Engineering' },
    ];
    
    for (const courseData of courseUpdates) {
      const updated = await Course.update(
        { 
          name: courseData.name,
          department: courseData.department,
          semester: '6',
          isElective: false
        },
        { where: { code: courseData.code } }
      );
      
      if (updated[0] > 0) {
        console.log(`✅ Updated ${courseData.code} - ${courseData.name}`);
      } else {
        console.log(`❌ Failed to update ${courseData.code}`);
      }
    }
    
    console.log('\n=== CHECKING UPDATED COURSES ===');
    
    const updatedCourses = await Course.findAll({
      where: {
        department: 'Computer Science and Engineering',
        semester: '6',
        isElective: false
      },
      attributes: ['code', 'name', 'credits'],
      order: [['code', 'ASC']]
    });
    
    console.log(`Found ${updatedCourses.length} mandatory courses for semester 6:`);
    updatedCourses.forEach(course => {
      console.log(`  ${course.code} - ${course.name} (${course.credits} credits)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateSem6Courses(); 
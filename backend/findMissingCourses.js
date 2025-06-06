const { Course } = require('./src/models');

async function findMissingCourses() {
  try {
    console.log('=== FINDING MISSING MANDATORY COURSES ===');
    
    const courseCodes = ['A6CS11', 'A6CS12', 'A6CS13', 'A6CS14', 'A6CS15'];
    
    for (const code of courseCodes) {
      const course = await Course.findOne({
        where: { code },
        attributes: ['code', 'name', 'semester', 'department', 'isElective']
      });
      
      if (course) {
        console.log(`${code}: Found in semester ${course.semester}, ${course.isElective ? 'Elective' : 'Mandatory'}`);
        console.log(`  Name: ${course.name}`);
        console.log(`  Department: ${course.department}`);
      } else {
        console.log(`${code}: NOT FOUND`);
      }
    }
    
    console.log('\n=== UPDATING COURSES TO SEMESTER 6 ===');
    
    // Update all these courses to semester 6 if they exist
    for (const code of courseCodes) {
      const updated = await Course.update(
        { semester: '6' },
        { where: { code } }
      );
      
      if (updated[0] > 0) {
        console.log(`✅ Updated ${code} to semester 6`);
      } else {
        console.log(`❌ Failed to update ${code} (not found)`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findMissingCourses(); 
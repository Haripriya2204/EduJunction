const { Course } = require('./src/models');

async function checkSem6Courses() {
  try {
    console.log('=== CSE SEMESTER 6 COURSES ===');
    
    const courses = await Course.findAll({
      where: {
        department: 'Computer Science and Engineering',
        semester: '6'
      },
      attributes: ['id', 'code', 'name', 'credits', 'isElective', 'category'],
      order: [['isElective', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`Found ${courses.length} courses for CSE semester 6:`);
    
    const mandatory = courses.filter(c => !c.isElective);
    const electives = courses.filter(c => c.isElective);
    
    console.log(`\n📚 MANDATORY COURSES (${mandatory.length}):`);
    mandatory.forEach(course => {
      console.log(`  ${course.code} - ${course.name} (${course.credits} credits)`);
    });
    
    console.log(`\n🎯 ELECTIVE COURSES (${electives.length}):`);
    electives.forEach(course => {
      console.log(`  ${course.code} - ${course.name} (${course.credits} credits) [${course.category}]`);
    });
    
    // Add some mandatory courses if there are too few
    if (mandatory.length < 4) {
      console.log('\n➕ Adding some mandatory courses for semester 6...');
      
      const mandatoryCourses = [
        { code: 'A6CS11', name: 'Software Engineering', credits: 3 },
        { code: 'A6CS12', name: 'Computer Networks', credits: 3 },
        { code: 'A6CS13', name: 'Database Management Systems', credits: 3 },
        { code: 'A6CS14', name: 'Operating Systems', credits: 3 },
        { code: 'A6CS15', name: 'Web Technologies Lab', credits: 1.5 },
      ];
      
      for (const courseData of mandatoryCourses) {
        // Check if course already exists
        const existing = await Course.findOne({
          where: { code: courseData.code }
        });
        
        if (!existing) {
          await Course.create({
            code: courseData.code,
            name: courseData.name,
            credits: courseData.credits,
            department: 'Computer Science and Engineering',
            semester: '6',
            isElective: false,
            category: '',
            offeringDepartment: '',
            peGroupId: null,
            oeGroupId: null
          });
          console.log(`  ✅ Added: ${courseData.code} - ${courseData.name}`);
        } else {
          console.log(`  ⏭️  Exists: ${courseData.code} - ${courseData.name}`);
        }
      }
    }
    
    console.log('\n✅ Semester 6 courses check completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking semester 6 courses:', error);
    process.exit(1);
  }
}

checkSem6Courses(); 
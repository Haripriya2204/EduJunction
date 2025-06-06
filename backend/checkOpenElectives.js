const { Course } = require('./src/models');

async function checkOpenElectives() {
  try {
    console.log('=== CHECKING OPEN ELECTIVES ===');
    
    const oeElectives = await Course.findAll({
      where: { category: 'OE' },
      attributes: ['code', 'name', 'semester', 'oeGroupId', 'department'],
      order: [['oeGroupId', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`Found ${oeElectives.length} Open Electives:`);
    oeElectives.forEach(course => {
      console.log(`  Group ${course.oeGroupId}: ${course.code} - ${course.name} (Semester ${course.semester}, ${course.department})`);
    });
    
    if (oeElectives.length === 0) {
      console.log('\n➕ Adding some sample Open Electives...');
      
      const sampleOE = [
        { code: 'OE801', name: 'Entrepreneurship', semester: '8', oeGroupId: 1, department: 'Computer Science and Engineering' },
        { code: 'OE802', name: 'Innovation Management', semester: '8', oeGroupId: 1, department: 'Computer Science and Engineering' },
        { code: 'OE803', name: 'Digital Marketing', semester: '8', oeGroupId: 2, department: 'Computer Science and Engineering' },
        { code: 'OE804', name: 'Business Analytics', semester: '8', oeGroupId: 2, department: 'Computer Science and Engineering' },
      ];
      
      for (const courseData of sampleOE) {
        await Course.create({
          code: courseData.code,
          name: courseData.name,
          credits: 3,
          department: courseData.department,
          semester: courseData.semester,
          isElective: true,
          category: 'OE',
          offeringDepartment: '',
          peGroupId: null,
          oeGroupId: courseData.oeGroupId
        });
        console.log(`  ✅ Added: ${courseData.code} - ${courseData.name} (Group ${courseData.oeGroupId})`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOpenElectives(); 
const { Course } = require('./src/models');

async function addSampleElectives() {
  try {
    console.log('Adding sample PE electives...');
    
    // PE Group 3 (for PE601 placeholder)
    const peGroup3 = [
      { code: 'A6CS01', name: 'Machine Learning', credits: 3 },
      { code: 'A6CS02', name: 'Data Mining', credits: 3 },
      { code: 'A6CS03', name: 'Computer Vision', credits: 3 },
      { code: 'A6CS04', name: 'Natural Language Processing', credits: 3 },
    ];
    
    // PE Group 4 (for PE602 placeholder)
    const peGroup4 = [
      { code: 'A6CS05', name: 'Cloud Computing', credits: 3 },
      { code: 'A6CS06', name: 'Blockchain Technology', credits: 3 },
      { code: 'A6CS07', name: 'Internet of Things', credits: 3 },
      { code: 'A6CS08', name: 'Cyber Security', credits: 3 },
    ];
    
    // Insert PE Group 3
    for (const course of peGroup3) {
      await Course.create({
        code: course.code,
        name: course.name,
        credits: course.credits,
        department: 'Computer Science and Engineering',
        semester: '6',
        isElective: true,
        category: 'PE',
        offeringDepartment: 'Computer Science and Engineering',
        peGroupId: 3,
        oeGroupId: null
      });
      console.log(`[PE Group 3] Added: ${course.code} - ${course.name}`);
    }
    
    // Insert PE Group 4
    for (const course of peGroup4) {
      await Course.create({
        code: course.code,
        name: course.name,
        credits: course.credits,
        department: 'Computer Science and Engineering',
        semester: '6',
        isElective: true,
        category: 'PE',
        offeringDepartment: 'Computer Science and Engineering',
        peGroupId: 4,
        oeGroupId: null
      });
      console.log(`[PE Group 4] Added: ${course.code} - ${course.name}`);
    }
    
    console.log('Sample PE electives added successfully!');
    
    // Verify the electives were added
    const peElectives = await Course.findAll({
      where: {
        isElective: true,
        category: 'PE',
        department: 'Computer Science and Engineering',
        semester: '6'
      },
      attributes: ['id', 'code', 'name', 'peGroupId'],
      order: [['peGroupId', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`\nVerification: Found ${peElectives.length} PE electives for CSE semester 6:`);
    peElectives.forEach(course => {
      console.log(`  Group ${course.peGroupId}: ${course.code} - ${course.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample electives:', error);
    process.exit(1);
  }
}

addSampleElectives(); 
const { StudentElective, Course } = require('./src/models');

async function testSaveElectives() {
  try {
    const userId = 19;
    const semester = '6';
    
    console.log('=== TESTING SAVE ELECTIVES FUNCTIONALITY ===');
    
    // First, let's create some test selections (unsaved)
    console.log('1. Creating test elective selections...');
    
    // Get some PE courses to select
    const peCourses = await Course.findAll({
      where: {
        isElective: true,
        category: 'PE',
        department: 'Computer Science and Engineering',
        semester: '6'
      },
      limit: 2,
      order: [['peGroupId', 'ASC']]
    });
    
    if (peCourses.length === 0) {
      console.log('No PE courses found for testing');
      return;
    }
    
    console.log(`Found ${peCourses.length} PE courses for testing:`);
    peCourses.forEach(course => {
      console.log(`  Group ${course.peGroupId}: ${course.code} - ${course.name}`);
    });
    
    // Clear any existing selections for this user/semester
    await StudentElective.destroy({
      where: { userId, semester }
    });
    
    // Create test selections (one from each group)
    for (const course of peCourses) {
      await StudentElective.create({
        userId,
        courseId: course.id,
        semester,
        peGroupId: course.peGroupId,
        oeGroupId: null,
        isSaved: false
      });
      console.log(`  Created selection: ${course.code} - ${course.name} (Group ${course.peGroupId})`);
    }
    
    // Check unsaved selections
    console.log('\n2. Checking unsaved selections...');
    const unsavedSelections = await StudentElective.findAll({
      where: { userId, semester, isSaved: false },
      include: [{ model: Course, as: 'course' }]
    });
    
    console.log(`Found ${unsavedSelections.length} unsaved selections:`);
    unsavedSelections.forEach(selection => {
      console.log(`  ${selection.course.code} - ${selection.course.name} (Group ${selection.peGroupId})`);
    });
    
    // Test the save functionality
    console.log('\n3. Testing save functionality...');
    const updateResult = await StudentElective.update(
      { isSaved: true },
      {
        where: {
          userId,
          semester,
          isSaved: false
        }
      }
    );
    
    console.log(`Save operation affected ${updateResult[0]} records`);
    
    // Verify saved selections
    console.log('\n4. Verifying saved selections...');
    const savedSelections = await StudentElective.findAll({
      where: { userId, semester, isSaved: true },
      include: [{ model: Course, as: 'course' }]
    });
    
    console.log(`Found ${savedSelections.length} saved selections:`);
    savedSelections.forEach(selection => {
      console.log(`  ${selection.course.code} - ${selection.course.name} (Group ${selection.peGroupId})`);
    });
    
    console.log('\n✅ Save electives test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing save electives:', error);
    process.exit(1);
  }
}

testSaveElectives(); 
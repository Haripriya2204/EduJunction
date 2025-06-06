const { StudentElective, Course } = require('./src/models');

async function createTestSelectionsForSave() {
  try {
    const userId = 19;
    const semester = '6';
    
    console.log('=== CREATING TEST SELECTIONS FOR SAVE ENDPOINT ===');
    
    // Clear any existing selections
    await StudentElective.destroy({
      where: { userId, semester }
    });
    console.log('Cleared existing selections');
    
    // Get available PE courses
    const peCourses = await Course.findAll({
      where: {
        isElective: true,
        category: 'PE',
        department: 'Computer Science and Engineering',
        semester: '6'
      },
      order: [['peGroupId', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`Found ${peCourses.length} PE courses:`);
    peCourses.forEach(course => {
      console.log(`  Group ${course.peGroupId}: ${course.code} - ${course.name}`);
    });
    
    if (peCourses.length >= 2) {
      // Select one course from group 3 and one from group 4
      const group3Course = peCourses.find(c => c.peGroupId === 3);
      const group4Course = peCourses.find(c => c.peGroupId === 4);
      
      if (group3Course) {
        await StudentElective.create({
          userId,
          courseId: group3Course.id,
          semester,
          peGroupId: group3Course.peGroupId,
          oeGroupId: null,
          isSaved: false
        });
        console.log(`✅ Created selection: ${group3Course.code} - ${group3Course.name} (Group ${group3Course.peGroupId})`);
      }
      
      if (group4Course) {
        await StudentElective.create({
          userId,
          courseId: group4Course.id,
          semester,
          peGroupId: group4Course.peGroupId,
          oeGroupId: null,
          isSaved: false
        });
        console.log(`✅ Created selection: ${group4Course.code} - ${group4Course.name} (Group ${group4Course.peGroupId})`);
      }
    }
    
    // Verify selections were created
    const unsavedSelections = await StudentElective.findAll({
      where: { userId, semester, isSaved: false },
      include: [{ model: Course, as: 'course' }]
    });
    
    console.log(`\n📋 Created ${unsavedSelections.length} unsaved selections:`);
    unsavedSelections.forEach(selection => {
      console.log(`  ${selection.course.code} - ${selection.course.name} (Group ${selection.peGroupId})`);
    });
    
    console.log('\n🎯 Ready to test save endpoint!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating test selections:', error);
    process.exit(1);
  }
}

createTestSelectionsForSave(); 
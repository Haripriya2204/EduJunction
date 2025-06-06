const { StudentElective, Course } = require('./src/models');

async function debugSaveElectives() {
  try {
    const userId = 19;
    const semester = '6';
    
    console.log('=== DEBUGGING SAVE ELECTIVES ISSUE ===');
    
    // Check current unsaved selections
    console.log('1. Checking current unsaved selections...');
    const unsavedSelections = await StudentElective.findAll({
      where: { userId, semester, isSaved: false },
      include: [{ model: Course, as: 'course' }]
    });
    
    console.log(`Found ${unsavedSelections.length} unsaved selections:`);
    unsavedSelections.forEach(selection => {
      console.log(`  ID: ${selection.id}`);
      console.log(`  Course: ${selection.course.code} - ${selection.course.name}`);
      console.log(`  peGroupId: ${selection.peGroupId} (type: ${typeof selection.peGroupId})`);
      console.log(`  oeGroupId: ${selection.oeGroupId} (type: ${typeof selection.oeGroupId})`);
      console.log(`  isSaved: ${selection.isSaved}`);
      console.log(`  isValidSelection(): ${selection.isValidSelection()}`);
      console.log('  ---');
    });
    
    if (unsavedSelections.length > 0) {
      console.log('\n2. Testing individual record update...');
      const firstSelection = unsavedSelections[0];
      
      try {
        console.log(`Attempting to update record ID ${firstSelection.id}...`);
        await firstSelection.update({ isSaved: true });
        console.log('✅ Individual update successful!');
      } catch (error) {
        console.log('❌ Individual update failed:', error.message);
        
        // Try to understand why validation is failing
        console.log('\nDebugging validation logic:');
        console.log(`peGroupId !== null: ${firstSelection.peGroupId !== null}`);
        console.log(`oeGroupId !== null: ${firstSelection.oeGroupId !== null}`);
        console.log(`(peGroupId !== null || oeGroupId !== null): ${(firstSelection.peGroupId !== null || firstSelection.oeGroupId !== null)}`);
        console.log(`!(peGroupId !== null && oeGroupId !== null): ${!(firstSelection.peGroupId !== null && firstSelection.oeGroupId !== null)}`);
        console.log(`Final result: ${(firstSelection.peGroupId !== null || firstSelection.oeGroupId !== null) && !(firstSelection.peGroupId !== null && firstSelection.oeGroupId !== null)}`);
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error debugging save electives:', error);
    process.exit(1);
  }
}

debugSaveElectives(); 
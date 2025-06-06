const { StudentElective } = require('./src/models');

async function testBulkUpdate() {
  try {
    const userId = 19;
    const semester = '6';
    
    console.log('=== TESTING BULK UPDATE OPERATION ===');
    
    // Check current unsaved selections
    const unsavedCount = await StudentElective.count({
      where: { userId, semester, isSaved: false }
    });
    
    console.log(`Found ${unsavedCount} unsaved selections for user ${userId}, semester ${semester}`);
    
    if (unsavedCount === 0) {
      console.log('No unsaved selections to test with');
      return;
    }
    
    // Test the exact bulk update operation used in the save endpoint
    console.log('\nTesting bulk update operation...');
    
    try {
      const updateResult = await StudentElective.update(
        { isSaved: true },
        {
          where: {
            userId,
            semester,
            isSaved: false
          },
          validate: false // Skip validation during update
        }
      );
      
      console.log(`✅ Bulk update successful! Updated ${updateResult[0]} records`);
      
      // Verify the update
      const savedCount = await StudentElective.count({
        where: { userId, semester, isSaved: true }
      });
      
      console.log(`Verification: Found ${savedCount} saved selections`);
      
    } catch (error) {
      console.log('❌ Bulk update failed:', error.message);
      console.log('Full error:', error);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing bulk update:', error);
    process.exit(1);
  }
}

testBulkUpdate(); 
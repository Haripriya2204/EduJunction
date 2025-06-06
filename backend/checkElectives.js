const { Course } = require('./src/models');

async function checkElectives() {
  try {
    console.log('=== CHECKING AVAILABLE ELECTIVES FOR SEMESTER 6 ===');
    
    const electives = await Course.findAll({
      where: {
        isElective: true,
        category: 'PE',
        department: 'Computer Science and Engineering',
        semester: '6'
      },
      attributes: ['id', 'code', 'name', 'peGroupId'],
      order: [['peGroupId', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`Found ${electives.length} PE electives:`);
    
    const grouped = {};
    electives.forEach(course => {
      if (!grouped[course.peGroupId]) {
        grouped[course.peGroupId] = [];
      }
      grouped[course.peGroupId].push(course);
    });
    
    Object.keys(grouped).forEach(groupId => {
      console.log(`\nGroup ${groupId}:`);
      grouped[groupId].forEach(course => {
        console.log(`  ${course.code} - ${course.name}`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkElectives(); 
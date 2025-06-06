const { Course } = require('./src/models');

async function checkPEElectives() {
  try {
    console.log('=== CHECKING PE ELECTIVES ===');
    
    const peElectives = await Course.findAll({
      where: {
        isElective: true,
        category: 'PE'
      },
      attributes: ['id', 'code', 'name', 'semester', 'peGroupId', 'department'],
      order: [['peGroupId', 'ASC'], ['code', 'ASC']]
    });
    
    console.log(`Found ${peElectives.length} PE electives:`);
    
    const groupedPE = {};
    peElectives.forEach(course => {
      if (!groupedPE[course.peGroupId]) {
        groupedPE[course.peGroupId] = [];
      }
      groupedPE[course.peGroupId].push(course);
    });
    
    Object.keys(groupedPE).forEach(groupId => {
      console.log(`\nGroup ${groupId}:`);
      groupedPE[groupId].forEach(course => {
        console.log(`  ${course.code} - ${course.name} (Sem: ${course.semester}, Dept: ${course.department})`);
      });
    });
    
    console.log('\n=== CHECKING PE ELECTIVES FOR CSE SEMESTER 6 ===');
    const cse6PE = await Course.findAll({
      where: {
        department: 'Computer Science and Engineering',
        semester: '6',
        isElective: true,
        category: 'PE'
      },
      attributes: ['id', 'code', 'name', 'peGroupId'],
      order: [['peGroupId', 'ASC']]
    });
    
    console.log(`Found ${cse6PE.length} PE electives for CSE semester 6:`);
    cse6PE.forEach(course => {
      console.log(`  Group ${course.peGroupId}: ${course.code} - ${course.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPEElectives(); 
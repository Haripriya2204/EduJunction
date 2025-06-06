const sequelize = require('./config/database');
const { StudentElective } = require('./src/models');

async function checkStudentElectives() {
  try {
    console.log('=== CHECKING STUDENT_ELECTIVES TABLE ===');
    
    // Try to describe the table
    try {
      const result = await sequelize.query('DESCRIBE student_electives');
      console.log('Table structure:', result[0]);
    } catch (e) {
      console.log('Error describing table:', e.message);
    }
    
    // Try to use the model
    try {
      const count = await StudentElective.count();
      console.log('StudentElective model works, count:', count);
    } catch (e) {
      console.log('Error using StudentElective model:', e.message);
    }
    
    // Check all tables again
    const tables = await sequelize.query('SHOW TABLES', { 
      type: sequelize.QueryTypes.SELECT 
    });
    console.log('All tables:');
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentElectives(); 
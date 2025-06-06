const sequelize = require('./config/database');

async function checkTables() {
  try {
    const tables = await sequelize.query('SHOW TABLES', { 
      type: sequelize.QueryTypes.SELECT 
    });
    console.log('Existing tables:');
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });
    
    const hasStudentElectives = tables.some(table => 
      Object.values(table)[0] === 'student_electives'
    );
    console.log('\nstudent_electives table exists:', hasStudentElectives);
    
    // Check migration status
    const migrations = await sequelize.query('SELECT * FROM SequelizeMeta ORDER BY name', { 
      type: sequelize.QueryTypes.SELECT 
    });
    console.log('\nApplied migrations:');
    migrations.forEach(migration => {
      console.log('  -', migration.name);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
checkTables(); 
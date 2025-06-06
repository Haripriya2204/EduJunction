const { StudentElective } = require('./src/models');
const sequelize = require('./config/database');

const clearStudentElectives = async () => {
  try {
    console.log('Clearing all entries from the student_electives table...');
    // Using raw query to truncate, which is often faster and avoids some locking issues.
    await sequelize.query('TRUNCATE TABLE `student_electives`');
    console.log(`Successfully cleared student elective selections.`);
  } catch (error) {
    console.error('Error clearing student_electives table:', error);
  } finally {
    // Ensure the database connection is closed.
    await sequelize.close();
  }
};

clearStudentElectives(); 
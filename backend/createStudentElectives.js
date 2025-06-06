const sequelize = require('./config/database');

async function createStudentElectivesTable() {
  try {
    const sql = `
      CREATE TABLE student_electives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        courseId INT NOT NULL,
        peGroupId INT NULL,
        oeGroupId INT NULL,
        semester VARCHAR(255) NOT NULL,
        isSaved BOOLEAN DEFAULT false,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (courseId) REFERENCES courses(id)
      )
    `;
    
    await sequelize.query(sql);
    console.log('student_electives table created successfully');
    
    // Verify the table was created
    const tables = await sequelize.query('SHOW TABLES', { 
      type: sequelize.QueryTypes.SELECT 
    });
    const hasStudentElectives = tables.some(table => 
      Object.values(table)[0] === 'student_electives'
    );
    console.log('student_electives table exists:', hasStudentElectives);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error.message);
    process.exit(1);
  }
}

createStudentElectivesTable(); 
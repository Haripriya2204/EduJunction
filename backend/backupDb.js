const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect
  }
);

async function backupDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database successfully.');

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // Get current timestamp for backup file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

    // Backup Users table
    const users = await sequelize.query('SELECT * FROM Users', { type: sequelize.QueryTypes.SELECT });
    console.log(`Backed up ${users.length} users`);

    // Backup Courses table
    const courses = await sequelize.query('SELECT * FROM Courses', { type: sequelize.QueryTypes.SELECT });
    console.log(`Backed up ${courses.length} courses`);

    // Backup FeeReceipts table
    const feeReceipts = await sequelize.query('SELECT * FROM FeeReceipts', { type: sequelize.QueryTypes.SELECT });
    console.log(`Backed up ${feeReceipts.length} fee receipts`);

    // Backup Requests table
    const requests = await sequelize.query('SELECT * FROM Requests', { type: sequelize.QueryTypes.SELECT });
    console.log(`Backed up ${requests.length} requests`);

    // Backup Notifications table
    const notifications = await sequelize.query('SELECT * FROM Notifications', { type: sequelize.QueryTypes.SELECT });
    console.log(`Backed up ${notifications.length} notifications`);

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      tables: {
        Users: users,
        Courses: courses,
        FeeReceipts: feeReceipts,
        Requests: requests,
        Notifications: notifications
      }
    };

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`Backup completed successfully. File saved as: ${backupFile}`);

  } catch (error) {
    console.error('Error during backup:', error);
  } finally {
    await sequelize.close();
  }
}

backupDatabase(); 
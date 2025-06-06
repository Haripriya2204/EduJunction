const { Sequelize } = require('sequelize');
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

async function checkConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Create Users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        role ENUM('student', 'admin') DEFAULT 'student',
        email VARCHAR(255),
        rollNo VARCHAR(255),
        semester VARCHAR(255),
        mobileNumber VARCHAR(255),
        position VARCHAR(255),
        profilePicture VARCHAR(255),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );
    `);
    console.log('Users table created or already exists.');

    // Create Courses table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(255) NOT NULL UNIQUE,
        department VARCHAR(255) NOT NULL,
        semester VARCHAR(255) NOT NULL,
        credits INT NOT NULL,
        isElective BOOLEAN NOT NULL DEFAULT false,
        category VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );
    `);
    console.log('Courses table created or already exists.');

    // Create FeeReceipts table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS FeeReceipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        file VARCHAR(255) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('FeeReceipts table created or already exists.');

    // Create Requests table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        type ENUM('gatepass', 'feeslip', 'elective') NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'on_hold') NOT NULL DEFAULT 'pending',
        details JSON,
        holdStartDate DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('Requests table created or already exists.');

    // Create Notifications table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        department VARCHAR(255) NOT NULL,
        deadline DATETIME,
        readBy JSON,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      );
    `);
    console.log('Notifications table created or already exists.');

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

checkConnection(); 
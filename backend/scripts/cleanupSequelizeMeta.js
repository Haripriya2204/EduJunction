const { sequelize } = require('../src/models');

async function cleanup() {
  try {
    await sequelize.query("DELETE FROM SequelizeMeta WHERE name = '20240518000100-create-course.js';");
    console.log('Deleted entry from SequelizeMeta.');
  } catch (err) {
    console.error('Error cleaning up SequelizeMeta:', err);
  } finally {
    await sequelize.close();
  }
}

cleanup(); 
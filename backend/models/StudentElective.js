const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentElective extends Model {}

  StudentElective.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    electiveType: {
      type: DataTypes.ENUM('PE', 'OE'),
      allowNull: false
    },
    slot: {
      type: DataTypes.STRING,
      allowNull: false // e.g., PE-I, OE-I
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'StudentElective',
    tableName: 'StudentElectives',
    timestamps: false
  });

  return StudentElective;
}; 
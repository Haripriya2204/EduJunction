'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.FeeReceipt, {
        foreignKey: 'userId',
        as: 'feeReceipts'
      });
      User.hasMany(models.Request, {
        foreignKey: 'userId',
        as: 'requests'
      });
    }
  }
  
  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false, // Always use department code (CSE, CSM, CSC, Aeronautical)
    },
    role: {
      type: DataTypes.ENUM('student', 'admin'),
      defaultValue: 'student'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    rollNo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    position: {
      type: DataTypes.STRING
    },
    profilePicture: {
      type: DataTypes.STRING
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true
  });
  
  return User;
}; 
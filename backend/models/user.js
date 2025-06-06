'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  User.init({
    username: DataTypes.STRING,
    name: DataTypes.STRING,
    password: DataTypes.STRING,
    department: DataTypes.STRING,
    role: DataTypes.STRING,
    email: DataTypes.STRING,
    rollNo: DataTypes.STRING,
    semester: DataTypes.STRING,
    mobileNumber: DataTypes.STRING,
    position: DataTypes.STRING,
    profilePicture: DataTypes.STRING,
    departmentId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
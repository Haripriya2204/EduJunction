const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Request extends Model {
    static associate(models) {
      Request.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
      Request.belongsTo(models.Department, { as: 'department', foreignKey: 'departmentId' });
    }
  }

  Request.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('feeslip', 'gatepass'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'on_hold'),
      defaultValue: 'pending'
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'id'
      }
    },
    details: {
      type: DataTypes.JSON,
      allowNull: false
    },
    holdStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Request',
    tableName: 'requests',
    timestamps: true
  });

  return Request;
}; 
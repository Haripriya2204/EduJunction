const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FeeReceipt extends Model {
    static associate(models) {
      FeeReceipt.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  FeeReceipt.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    file: {
      type: DataTypes.STRING,
      allowNull: false
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentMode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transactionNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FeeReceipt',
    tableName: 'feeReceipts',
    timestamps: true
  });

  return FeeReceipt;
}; 
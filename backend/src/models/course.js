const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      Course.hasMany(models.StudentElective, {
        foreignKey: 'courseId',
        as: 'studentSelections'
      });
    }

    // Helper method to check if course is a valid elective
    isValidElective() {
      return this.isElective && (this.peGroupId !== null || this.oeGroupId !== null);
    }
  }

  Course.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['1', '2', '3', '4', '5', '6', '7', '8']]
      }
    },
    credits: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 4
      }
    },
    isElective: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [['PE', 'OE', null]]
      }
    },
    peGroupId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 7
      }
    },
    oeGroupId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 3
      }
    },
    offeringDepartment: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Course',
    tableName: 'courses',
    timestamps: true,
    validate: {
      validateElectiveGroup() {
        if (this.isElective) {
          if (!this.peGroupId && !this.oeGroupId) {
            throw new Error('Elective courses must have either peGroupId or oeGroupId');
          }
          if (this.peGroupId && this.oeGroupId) {
            throw new Error('A course cannot be both PE and OE');
          }
          if (this.peGroupId && (!this.category || this.category !== 'PE')) {
            throw new Error('PE courses must have category set to PE');
          }
          if (this.oeGroupId && (!this.category || this.category !== 'OE')) {
            throw new Error('OE courses must have category set to OE');
          }
        }
      }
    }
  });

  return Course;
}; 
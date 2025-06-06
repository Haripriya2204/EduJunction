'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_electives', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        }
      },
      peGroupId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      oeGroupId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      semester: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isSaved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add unique constraint to prevent multiple selections in same group
    await queryInterface.addIndex('student_electives', ['userId', 'peGroupId', 'semester'], {
      unique: true,
      where: {
        peGroupId: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    await queryInterface.addIndex('student_electives', ['userId', 'oeGroupId', 'semester'], {
      unique: true,
      where: {
        oeGroupId: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('student_electives');
  }
}; 
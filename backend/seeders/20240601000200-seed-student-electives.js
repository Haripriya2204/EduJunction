'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Do not pre-seed any electives so students can select themselves
    // If you want to insert with isSaved: false, uncomment below:
    // const students = await queryInterface.sequelize.query(
    //   "SELECT id, department FROM users WHERE role = 'student' AND semester = '6';",
    //   { type: Sequelize.QueryTypes.SELECT }
    // );
    // // Get all PE and OE courses for semester 6
    // const peCourses = await queryInterface.sequelize.query(
    //   "SELECT id, department, peGroupId FROM Courses WHERE isElective = 1 AND category = 'PE' AND semester = '6';",
    //   { type: Sequelize.QueryTypes.SELECT }
    // );
    // const oeCourses = await queryInterface.sequelize.query(
    //   "SELECT id, department, oeGroupId FROM Courses WHERE isElective = 1 AND category = 'OE' AND semester = '6';",
    //   { type: Sequelize.QueryTypes.SELECT }
    // );
    // const now = new Date();
    // const selections = [];
    // for (const student of students) {
    //   // Find a PE and OE for this student's department
    //   const pe = peCourses.find(c => c.department === student.department);
    //   const oe = oeCourses.find(c => c.department === student.department);
    //   if (pe) {
    //     selections.push({
    //       userId: student.id,
    //       courseId: pe.id,
    //       peGroupId: pe.peGroupId,
    //       oeGroupId: null,
    //       semester: '6',
    //       isSaved: false,
    //       createdAt: now,
    //       updatedAt: now
    //     });
    //   }
    //   if (oe) {
    //     selections.push({
    //       userId: student.id,
    //       courseId: oe.id,
    //       peGroupId: null,
    //       oeGroupId: oe.oeGroupId,
    //       semester: '6',
    //       isSaved: false,
    //       createdAt: now,
    //       updatedAt: now
    //     });
    //   }
    // }
    // if (selections.length) {
    //   await queryInterface.bulkInsert('student_electives', selections, {});
    // }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('student_electives', null, {});
  }
}; 
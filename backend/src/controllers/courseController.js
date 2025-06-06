const { Course } = require('../models');
const db = require('../models');

// Fetch all Professional Elective groups for a department and semester
exports.getProfessionalElectiveGroups = async (req, res) => {
  try {
    const { department, semester } = req.query;
    // Find all unique peGroupIds for this department/semester
    const groups = await Course.findAll({
      where: {
        department,
        isElective: true,
        category: 'Professional Elective',
        semester
      },
      attributes: ['peGroupId'],
      group: ['peGroupId'],
      raw: true
    });
    const groupIds = groups.map(g => g.peGroupId).filter(Boolean);
    // For each group, fetch all courses in that group
    const result = [];
    for (const peGroupId of groupIds) {
      const courses = await Course.findAll({
        where: {
          department,
          isElective: true,
          category: 'Professional Elective',
          semester,
          peGroupId
        }
      });
      result.push({ peGroupId, courses });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch Professional Elective groups' });
  }
};

// Fetch all mandatory courses for a student based on latest approved fee receipt
exports.getMandatoryCourses = async (req, res) => {
  try {
    const { userId } = req.query;
    // Find the latest approved fee receipt for the user
    const receipt = await db.FeeReceipt.findOne({
      where: { userId, status: 'approved' },
      order: [['createdAt', 'DESC']]
    });
    if (!receipt || !receipt.semester) {
      console.log('DEBUG: No approved fee receipt or semester for userId', userId, 'receipt:', receipt);
      return res.json([]);
    }
    // Find the user's department
    const user = await db.User.findByPk(userId);
    if (!user) {
      console.log('DEBUG: No user found for userId', userId);
      return res.json([]);
    }
    console.log('DEBUG: userId', userId, 'user.department', user.department, 'receipt.semester', receipt.semester);
    // Fetch mandatory courses for the department and semester (non-elective)
    let courses = await db.Course.findAll({
      where: {
        department: user.department,
        semester: receipt.semester,
        isElective: false
      },
      attributes: ['id', 'code', 'name', 'credits', 'department', 'semester']
    });
    // Fetch saved electives for this user/semester
    const savedElectives = await db.StudentElective.findAll({
      where: {
        userId,
        semester: receipt.semester,
        isSaved: true
      },
      include: [{ model: db.Course, as: 'course' }]
    });
    console.log('DEBUG: savedElectives', savedElectives.map(sel => ({ peGroupId: sel.peGroupId, code: sel.course?.code, name: sel.course?.name })));
    // Map peGroupId to elective
    const peElectiveMap = {};
    savedElectives.forEach(sel => {
      if (sel.peGroupId) peElectiveMap[sel.peGroupId] = sel.course;
    });
    // For each course, if it's a PE placeholder and a saved elective exists, replace code and name only
    const mergedCourses = courses.map(c => {
      if (/^Professional Elective/.test(c.name)) {
        // Determine groupId
        let groupId = null;
        if (/Professional Elective - I/.test(c.name)) groupId = 1;
        if (/Professional Elective - II/.test(c.name)) groupId = 2;
        if (/Professional Elective - III(?!\s*LAB)/.test(c.name)) groupId = 3;
        if (/Professional Elective - III\s*LAB/.test(c.name)) groupId = 4;
        if (/Professional Elective - V/.test(c.name)) groupId = 5;
        if (/Professional Elective - VI/.test(c.name)) groupId = 6;
        
        if (groupId && peElectiveMap[groupId]) {
          const elective = peElectiveMap[groupId];
          return {
            ...c,
            code: elective.code,
            name: elective.name,
            // credits remains as c.credits
          };
        }
      }
      return c;
    });
    console.log('DEBUG: FINAL mergedCourses', mergedCourses);
    res.json(mergedCourses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mandatory courses' });
  }
};

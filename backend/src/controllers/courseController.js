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
      return res.json({ courses: [], selectedElectivesMap: {} });
    }
    // Find the user's department
    const user = await db.User.findByPk(userId);
    if (!user) {
      console.log('DEBUG: No user found for userId', userId);
      return res.json({ courses: [], selectedElectivesMap: {} });
    }
    console.log('DEBUG: userId', userId, 'user.department', user.department, 'receipt.semester', receipt.semester);

    // Fetch mandatory courses for the department and semester (non-elective)
    const courses = await db.Course.findAll({
      where: {
        department: user.department,
        semester: receipt.semester,
        isElective: false,
      },
      attributes: ['id', 'code', 'name', 'credits', 'department', 'semester', 'category'],
      order: [['code', 'ASC']],
    });

    // Fetch all selected electives for this user/semester (pending and saved)
    const selectedElectives = await db.StudentElective.findAll({
      where: {
        userId,
        semester: receipt.semester,
      },
      include: [{ model: db.Course, as: 'course' }],
    });

    console.log(
      'DEBUG: selectedElectives',
      selectedElectives.map(sel => ({
        peGroupId: sel.peGroupId,
        oeGroupId: sel.oeGroupId,
        code: sel.course?.code,
        name: sel.course?.name,
      }))
    );

    // Create a map of group IDs to the selected course details
    const selectedElectivesMap = {};
    selectedElectives.forEach(sel => {
      const groupKey = sel.peGroupId ? `pe-${sel.peGroupId}` : `oe-${sel.oeGroupId}`;
      if (groupKey) {
        selectedElectivesMap[groupKey] = sel.course.toJSON();
      }
    });

    console.log('DEBUG: selectedElectivesMap', selectedElectivesMap);

    // Send the original mandatory courses and the map of selections
    res.json({
      courses: courses.map(c => c.toJSON()),
      selectedElectivesMap: selectedElectivesMap,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mandatory courses' });
  }
};

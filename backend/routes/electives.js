const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { StudentElective, Course, User } = require('../models');
const { Op } = require('sequelize');

// Helper function to validate semester
const isValidSemester = (semester) => {
  const semesterNum = parseInt(semester);
  return !isNaN(semesterNum) && semesterNum >= 1 && semesterNum <= 8;
};

// Helper function to validate elective group
const isValidElectiveGroup = (peGroupId, oeGroupId) => {
  if (peGroupId && oeGroupId) return false;
  if (peGroupId) return peGroupId >= 1 && peGroupId <= 7;
  if (oeGroupId) return oeGroupId >= 1 && oeGroupId <= 3;
  return false;
};

// Get available electives for a student
router.get('/available/:userId/:semester', authenticateToken, async (req, res) => {
  try {
    const { userId, semester } = req.params;

    // Validate semester
    if (!isValidSemester(semester)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid semester' 
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log('DEBUG: User department:', user.department, 'semester:', semester);

    // Get all elective courses for the student's department and semester
    const electiveCourses = await Course.findAll({
      where: {
        department: user.department,
        semester,
        isElective: true,
        [Op.or]: [
          { peGroupId: { [Op.ne]: null } },
          { oeGroupId: { [Op.ne]: null } }
        ]
      },
      order: [
        ['peGroupId', 'ASC'],
        ['oeGroupId', 'ASC'],
        ['code', 'ASC']
      ]
    });

    console.log('DEBUG: electiveCourses found:', electiveCourses.map(c => ({id: c.id, code: c.code, department: c.department, semester: c.semester, isElective: c.isElective, category: c.category, peGroupId: c.peGroupId, oeGroupId: c.oeGroupId})));

    // Get student's current selections
    const currentSelections = await StudentElective.findAll({
      where: { 
        userId, 
        semester,
        isSaved: true
      },
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'name', 'credits', 'peGroupId', 'oeGroupId']
      }]
    });

    // Use a Map to prevent duplicates based on course ID
    const courseMap = new Map();
    electiveCourses.forEach(course => {
      courseMap.set(course.id, course);
    });

    // Group unique courses by elective group
    const groupedElectives = {};
    Array.from(courseMap.values()).forEach(course => {
      const groupId = course.peGroupId || course.oeGroupId;
      if (!groupedElectives[groupId]) {
        groupedElectives[groupId] = [];
      }
      
      // Check if this course is already selected
      const isSelected = currentSelections.some(selection => 
        selection.courseId === course.id
      );

      groupedElectives[groupId].push({
        ...course.toJSON(),
        isSelected,
        groupType: course.peGroupId ? 'PE' : 'OE'
      });
    });

    res.json({ 
      success: true, 
      data: groupedElectives,
      message: 'Available electives retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching available electives:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Select an elective
router.post('/select', authenticateToken, async (req, res) => {
  try {
    const { userId, courseId, semester, peGroupId, oeGroupId } = req.body;

    // Validate input
    if (!userId || !courseId || !semester || !isValidElectiveGroup(peGroupId, oeGroupId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input: missing or invalid required fields' 
      });
    }

    // Validate semester
    if (!isValidSemester(semester)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid semester' 
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if course exists and is a valid elective
    const course = await Course.findOne({
      where: { 
        id: courseId,
        isElective: true,
        department: user.department,
        semester,
        [Op.or]: [
          { peGroupId },
          { oeGroupId }
        ]
      }
    });

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid elective course for your department and semester' 
      });
    }

    // Check if student already has a saved selection in this group
    const existingSavedSelection = await StudentElective.findOne({
      where: {
        userId,
        semester,
        isSaved: true,
        [Op.or]: [
          { peGroupId },
          { oeGroupId }
        ]
      }
    });

    if (existingSavedSelection) {
      return res.status(400).json({
        success: false,
        message: 'You have already finalized a selection for this elective group'
      });
    }

    // Check if student already has a pending selection in this group
    const existingSelection = await StudentElective.findOne({
      where: {
        userId,
        semester,
        [Op.or]: [
          { peGroupId },
          { oeGroupId }
        ]
      }
    });

    if (existingSelection) {
      // Update existing selection
      await existingSelection.update({
        courseId,
        peGroupId,
        oeGroupId,
        isSaved: false // Reset saved status when selection changes
      });
    } else {
      // Create new selection
      await StudentElective.create({
        userId,
        courseId,
        semester,
        peGroupId,
        oeGroupId,
        isSaved: false
      });
    }

    res.json({ 
      success: true, 
      message: 'Elective selected successfully. Remember to save your selections when done.' 
    });
  } catch (error) {
    console.error('Error selecting elective:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Save elective selections
router.post('/save/:userId/:semester', authenticateToken, async (req, res) => {
  try {
    const { userId, semester } = req.params;

    // Validate semester
    if (!isValidSemester(semester)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid semester' 
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get all unsaved selections for this student and semester
    const selections = await StudentElective.findAll({
      where: {
        userId,
        semester,
        isSaved: false
      },
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'name', 'credits', 'peGroupId', 'oeGroupId']
      }]
    });

    if (selections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending selections to save'
      });
    }

    // Get required elective groups for the student's department and semester
    const requiredGroups = await Course.findAll({
      where: {
        department: user.department,
        semester,
        isElective: true,
        [Op.or]: [
          { peGroupId: { [Op.ne]: null } },
          { oeGroupId: { [Op.ne]: null } }
        ]
      },
      attributes: ['peGroupId', 'oeGroupId'],
      group: ['peGroupId', 'oeGroupId']
    });

    // Check if all required groups have selections
    const selectedGroups = new Set();
    selections.forEach(selection => {
      if (selection.peGroupId) selectedGroups.add(selection.peGroupId);
      if (selection.oeGroupId) selectedGroups.add(selection.oeGroupId);
    });

    const requiredGroupIds = new Set();
    requiredGroups.forEach(group => {
      if (group.peGroupId) requiredGroupIds.add(group.peGroupId);
      if (group.oeGroupId) requiredGroupIds.add(group.oeGroupId);
    });

    const missingGroups = Array.from(requiredGroupIds)
      .filter(id => !selectedGroups.has(id));

    if (missingGroups.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please select electives for all required groups: ${missingGroups.join(', ')}`
      });
    }

    // Mark all selections as saved
    await StudentElective.update(
      { isSaved: true },
      {
        where: {
          userId,
          semester,
          isSaved: false
        }
      }
    );

    res.json({ 
      success: true, 
      message: 'Elective selections saved successfully. Your selections are now finalized.' 
    });
  } catch (error) {
    console.error('Error saving elective selections:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get elective selection status
router.get('/status/:userId/:semester', authenticateToken, async (req, res) => {
  try {
    const { userId, semester } = req.params;

    // Validate semester
    if (!isValidSemester(semester)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid semester' 
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get all saved selections for this student and semester
    const selections = await StudentElective.findAll({
      where: {
        userId,
        semester,
        isSaved: true
      },
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'name', 'credits', 'peGroupId', 'oeGroupId', 'category']
      }]
    });

    // Get required elective groups for the student's department and semester
    const requiredGroups = await Course.findAll({
      where: {
        department: user.department,
        semester,
        isElective: true,
        [Op.or]: [
          { peGroupId: { [Op.ne]: null } },
          { oeGroupId: { [Op.ne]: null } }
        ]
      },
      attributes: ['peGroupId', 'oeGroupId', 'category'],
      group: ['peGroupId', 'oeGroupId', 'category']
    });

    const selectedGroups = new Set();
    selections.forEach(selection => {
      if (selection.peGroupId) selectedGroups.add(selection.peGroupId);
      if (selection.oeGroupId) selectedGroups.add(selection.oeGroupId);
    });

    const requiredGroupIds = new Set();
    requiredGroups.forEach(group => {
      if (group.peGroupId) requiredGroupIds.add(group.peGroupId);
      if (group.oeGroupId) requiredGroupIds.add(group.oeGroupId);
    });

    const electivesFinalized = selections.length > 0 && 
      Array.from(requiredGroupIds).every(id => selectedGroups.has(id));

    // Group selections by type (PE/OE)
    const groupedSelections = {
      PE: selections.filter(s => s.course.category === 'PE'),
      OE: selections.filter(s => s.course.category === 'OE')
    };

    res.json({
      success: true,
      electivesFinalized,
      selections: groupedSelections,
      requiredGroups: requiredGroups.map(g => ({
        groupId: g.peGroupId || g.oeGroupId,
        category: g.category
      })),
      message: electivesFinalized ? 
        'All elective selections are finalized' : 
        'Some elective selections are pending'
    });
  } catch (error) {
    console.error('Error fetching elective status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 
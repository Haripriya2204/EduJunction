const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const Course = require('../models/course');

// GET /api/courses/professional-electives/groups?department=CSE&semester=5
router.get('/professional-electives/groups', courseController.getProfessionalElectiveGroups);

// GET /api/courses/mandatory?userId=13
router.get('/mandatory', courseController.getMandatoryCourses);

// Get all courses with optional filters
router.get('/', async (req, res) => {
  try {
    const { department, semester, isElective, category } = req.query;
    const where = {};
    if (department) where.department = department;
    if (semester) where.semester = semester;
    if (isElective !== undefined) where.isElective = isElective === 'true';
    if (category) where.category = category;
    const courses = await Course.findAll({ where });
    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get a single course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create a new course
router.post('/', async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update a course
router.put('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    await course.update(req.body);
    res.json(course);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete a course
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    await course.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router; 
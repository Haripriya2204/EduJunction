const express = require('express');
const router = express.Router();
const Request = require('../models/request');
const User = require('../models/User');
const Department = require('../models/department');
const Notification = require('../models/notification');
const requestController = require('../controllers/requestController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Get all requests with optional filters
router.get('/', requestController.getAllRequests);

// Add route for student: get all requests for the logged-in student
router.get('/my', authMiddleware, requestController.getMyRequests);

// Add route for admin: get all requests for the department
router.get('/department', authMiddleware, roleMiddleware('admin'), requestController.getDepartmentRequests);

// Get a single request by ID
router.get('/:id', requestController.getRequestById);

// Create a new request
router.post('/', requestController.createRequest);

// Update a request (full update)
router.put('/:id', requestController.updateRequest);
// Update a request (partial update, e.g., status)
router.patch('/:id', requestController.updateRequest);

// Delete a request
router.delete('/:id', requestController.deleteRequest);

module.exports = router;
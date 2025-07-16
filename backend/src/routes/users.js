// src/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// User search and discovery
router.get('/search', validatePagination, userController.searchUsers);
router.get('/online', validatePagination, userController.getOnlineUsers);
router.get('/contacts', validatePagination, userController.getContacts);
router.get('/stats', userController.getUserStats);

// Specific user routes
router.get('/:id', validateObjectId('id'), userController.getUserById);

// User interaction routes (placeholders for future features)
router.post('/:id/block', validateObjectId('id'), userController.blockUser);
router.post('/:id/report', validateObjectId('id'), userController.reportUser);

module.exports = router;
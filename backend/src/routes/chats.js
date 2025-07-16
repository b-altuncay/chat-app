// src/routes/chats.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken, checkChatParticipant } = require('../middleware/auth');
const { 
  validateCreateChat, 
  validateSendMessage,
  validateObjectId,
  validatePagination 
} = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Chat management routes
router.get('/', validatePagination, chatController.getUserChats);
router.post('/', validateCreateChat, chatController.createChat);

// Specific chat routes
router.get('/:id', validateObjectId('id'), checkChatParticipant, chatController.getChat);
router.delete('/:id', validateObjectId('id'), checkChatParticipant, chatController.deleteChat);

// Message routes
router.get('/:id/messages', 
  validateObjectId('id'), 
  checkChatParticipant, 
  validatePagination, 
  chatController.getChatMessages
);

router.post('/:id/messages', 
  validateObjectId('id'), 
  checkChatParticipant, 
  validateSendMessage, 
  chatController.sendMessage
);

router.put('/:id/read', 
  validateObjectId('id'), 
  checkChatParticipant, 
  chatController.markMessagesAsRead
);

// Group chat management routes
router.post('/:id/participants', 
  validateObjectId('id'), 
  checkChatParticipant, 
  chatController.addParticipant
);

router.delete('/:id/participants', 
  validateObjectId('id'), 
  checkChatParticipant, 
  chatController.removeParticipant
);

module.exports = router;
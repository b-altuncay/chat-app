// src/routes/chats.js
/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: Sohbet yönetimi ve mesajlaşma işlemleri
 */
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

// Tüm istekler için kimlik doğrulama zorunlu
router.use(authenticateToken);

/**
 * @swagger
 * /chats:
 *   get:
 *     summary: Kullanıcının sohbet listesini getirir
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Sayfa numarası
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Sayfa başına sohbet sayısı
 *         example: 50
 *     responses:
 *       200:
 *         description: Sohbetler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/', validatePagination, chatController.getUserChats);
router.post('/', validateCreateChat, chatController.createChat);
router.get('/:id', validateObjectId('id'), checkChatParticipant, chatController.getChat);

/**
 * @swagger
 * /chats/{id}:
 *   delete:
 *     summary: Bir sohbeti siler
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Silinecek sohbetin kimliği
 *     responses:
 *       200:
 *         description: Sohbet başarıyla silindi
 *       403:
 *         description: Erişim reddedildi
 *       404:
 *         description: Sohbet bulunamadı
 */
router.delete('/:id', validateObjectId('id'), checkChatParticipant, chatController.deleteChat);

/**
 * @swagger
 * /chats/{id}/messages:
 *   get:
 *     summary: Bir sohbete ait mesajları getirir
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sohbet kimlik numarası
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Sayfa numarası
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Sayfa başına mesaj sayısı
 *         example: 50
 *     responses:
 *       200:
 *         description: Mesajlar başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/:id/messages', 
  validateObjectId('id'), 
  checkChatParticipant, 
  validatePagination, 
  chatController.getChatMessages
);

/**
 * @swagger
 * /chats/{id}/messages:
 *   post:
 *     summary: Bir sohbete mesaj gönderir
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sohbet kimlik numarası
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Merhaba!"
 *               messageType:
 *                 type: string
 *                 example: "text"
 *               replyTo:
 *                 type: string
 *                 example: "messageId123"
 *     responses:
 *       201:
 *         description: Mesaj başarıyla gönderildi
 *       400:
 *         description: Geçersiz veri
 */
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

// src/routes/users.js

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Kullanıcı arama, keşif ve profil işlemleri
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

// Tüm rotalar için kimlik doğrulama
router.use(authenticateToken);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Kullanıcıları arar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: En az 2 karakterli arama sorgusu
 *         example: ali
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
 *         description: Sayfa başına sonuç sayısı
 *         example: 20
 *     responses:
 *       200:
 *         description: Kullanıcılar başarıyla bulundu
 *       400:
 *         description: Sorgu en az 2 karakter olmalı
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/search', validatePagination, userController.searchUsers);

/**
 * @swagger
 * /users/online:
 *   get:
 *     summary: Çevrimiçi kullanıcıları getirir
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 50
 *     responses:
 *       200:
 *         description: Çevrimiçi kullanıcılar listelendi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/online', validatePagination, userController.getOnlineUsers);

/**
 * @swagger
 * /users/contacts:
 *   get:
 *     summary: Kullanıcının sohbet kontaklarını getirir
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 50
 *     responses:
 *       200:
 *         description: Kontaklar başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/contacts', validatePagination, userController.getContacts);

/**
 * @swagger
 * /users/stats:
 *   get:
 *     summary: Kullanıcı istatistiklerini getirir
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/stats', userController.getUserStats);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: ID ile kullanıcı detayını getirir
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcı kimlik numarası
 *     responses:
 *       200:
 *         description: Kullanıcı başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/:id', validateObjectId('id'), userController.getUserById);

/**
 * @swagger
 * /users/{id}/block:
 *   post:
 *     summary: Kullanıcıyı engeller (placeholder)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Engellenecek kullanıcı kimlik numarası
 *     responses:
 *       200:
 *         description: Engelleme özelliği (henüz uygulanmadı)
 *       400:
 *         description: Geçersiz istek
 */
router.post('/:id/block', validateObjectId('id'), userController.blockUser);

/**
 * @swagger
 * /users/{id}/report:
 *   post:
 *     summary: Kullanıcıyı şikayet eder (placeholder)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Şikayet edilecek kullanıcı kimlik numarası
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Spam davranışı"
 *     responses:
 *       200:
 *         description: Şikayet özelliği (henüz uygulanmadı)
 *       400:
 *         description: Geçersiz istek
 */
router.post('/:id/report', validateObjectId('id'), userController.reportUser);

module.exports = router;

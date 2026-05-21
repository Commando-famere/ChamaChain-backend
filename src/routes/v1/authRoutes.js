const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { validate } = require('../../middleware/validate');
const { verifyToken } = require('../../middleware/auth');

// Public routes
router.post('/register', validate('register'), authController.register);
router.post('/login', validate('login'), authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes (require token)
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.post('/logout', verifyToken, authController.logout);

module.exports = router;

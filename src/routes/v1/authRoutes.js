const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { validate } = require('../../middleware/validate');

// Register - uses controller with session creation
router.post('/register', validate('register'), authController.register);

// Login
router.post('/login', validate('login'), authController.login);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Get profile
router.get('/profile', authController.getProfile);

// Logout
router.post('/logout', authController.logout);

module.exports = router;

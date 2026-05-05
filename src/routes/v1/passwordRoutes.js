const express = require('express');
const router = express.Router();
const { forgotPassword, resetPassword, verifyCode } = require('../../controllers/passwordController');

// Request password reset (sends code)
router.post('/forgot', forgotPassword);

// Verify recovery code
router.post('/verify-code', verifyCode);

// Reset password with code
router.post('/reset', resetPassword);

module.exports = router;

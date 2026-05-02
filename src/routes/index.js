const express = require('express');
const router = express.Router();

// Route modules
router.use('/auth', require('./v1/authRoutes'));
router.use('/chamas', require('./v1/chamaRoutes'));
router.use('/members', require('./v1/memberRoutes'));
router.use('/invites', require('./v1/inviteRoutes'));
router.use('/profile', require('./v1/profileRoutes'));
router.use('/dashboard', require('./v1/dashboardRoutes'));
router.use('/meetings', require('./v1/meetingRoutes'));
router.use('/chat', require('./v1/chatRoutes'));
router.use('/crypto', require('./v1/cryptoRoutes'));

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'API is working' });
});

module.exports = router;

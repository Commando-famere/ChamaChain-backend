const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./v1/authRoutes');
const chamaRoutes = require('./v1/chamaRoutes');
const memberRoutes = require('./v1/memberRoutes');
const inviteRoutes = require('./v1/inviteRoutes');
const profileRoutes = require('./v1/profileRoutes');
const dashboardRoutes = require('./v1/dashboardRoutes');
const meetingRoutes = require('./v1/meetingRoutes');
const chatRoutes = require('./v1/chatRoutes');
const cryptoRoutes = require('./v1/cryptoRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/chamas', chamaRoutes);
router.use('/members', memberRoutes);
router.use('/invites', inviteRoutes);
router.use('/profile', profileRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/meetings', meetingRoutes);
router.use('/chat', chatRoutes);
router.use('/crypto', cryptoRoutes);

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'API is working' });
});

module.exports = router;

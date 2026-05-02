const express = require('express');
const router = express.Router();

// Routes
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'API is working' });
});

// API route groups
router.use('/auth', require('./v1/authRoutes'));
router.use('/chamas', require('./v1/chamaRoutes'));
router.use('/members', require('./v1/memberRoutes'));
router.use('/invites', require('./v1/inviteRoutes'));
router.use('/profile', require('./v1/profileRoutes'));
router.use('/dashboard', require('./v1/dashboardRoutes'));

module.exports = router;

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./v1/authRoutes');
const chamaRoutes = require('./v1/chamaRoutes');
const memberRoutes = require('./v1/memberRoutes');
const meetingRoutes = require('./v1/meetingRoutes');
const financialRoutes = require('./v1/financialRoutes');
const withdrawalRoutes = require('./v1/withdrawalRoutes');
const inviteRoutes = require('./v1/inviteRoutes');
const dashboardRoutes = require('./v1/dashboardRoutes');

// API v1 routes
router.use('/auth', authRoutes);
router.use('/chamas', chamaRoutes);
router.use('/members', memberRoutes);
router.use('/meetings', meetingRoutes);
router.use('/financial', financialRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/invites', inviteRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;

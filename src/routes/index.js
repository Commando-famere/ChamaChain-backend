const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./v1/authRoutes');
const chamaRoutes = require('./v1/chamaRoutes');

// API v1 routes
router.use('/auth', authRoutes);
router.use('/chamas', chamaRoutes);

module.exports = router;

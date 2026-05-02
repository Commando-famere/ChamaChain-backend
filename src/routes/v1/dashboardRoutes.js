const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { getMemberDashboard, getPayoutHistory } = require('../../controllers/memberDashboardController');
const { getChairpersonDashboard, getChamaRollingSettings, updateChamaRollingSettings } = require('../../controllers/chairpersonDashboardController');

// All routes require authentication
router.use(verifyToken);

// Member routes
router.get('/member/:chamaId', getMemberDashboard);
router.get('/member/:chamaId/payouts', getPayoutHistory);

// Chairperson routes
router.get('/chairperson/:chamaId', getChairpersonDashboard);
router.get('/chairperson/:chamaId/rolling-settings', getChamaRollingSettings);
router.put('/chairperson/:chamaId/rolling-settings', updateChamaRollingSettings);

module.exports = router;

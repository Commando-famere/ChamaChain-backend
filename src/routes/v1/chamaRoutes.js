const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { createChama, confirmPayment, getUserChamas, getChama } = require('../../controllers/chamaController');
const memberController = require('../../controllers/memberController');
const meetingController = require('../../controllers/meetingController');

router.use(verifyToken);

// Core chama routes
router.post('/', createChama);
router.post('/confirm-payment', confirmPayment);
router.get('/', getUserChamas);
router.get('/:chamaId', getChama);

// Member routes (chairperson only)
router.get('/:chamaId/members/all', memberController.getAllMembers);

// Meeting history
router.get('/:chamaId/meetings/history', meetingController.getMeetingHistory);

// Chairperson dashboard
const chairpersonDashboard = require('../../controllers/chairpersonDashboardController');
router.get('/:chamaId/chairperson/dashboard', chairpersonDashboard.getChairpersonDashboard);

module.exports = router;

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { createChama, confirmPayment, getUserChamas, getChama, upgradePlan } = require('../../controllers/chamaController');
const memberController = require('../../controllers/memberController');
const meetingController = require('../../controllers/meetingController');

router.use(verifyToken);

// Core chama routes
router.post('/', createChama);
router.post('/confirm-payment', confirmPayment);
router.get('/', getUserChamas);
router.get('/:chamaId', getChama);
router.put('/:chamaId/upgrade', upgradePlan);

// Member management (chairperson only)
router.get('/:chamaId/members/all', memberController.getAllMembers);
router.put('/:chamaId/members/:memberId/role', memberController.updateMemberRole);
router.delete('/:chamaId/members/:memberId', memberController.removeMember);
router.get('/:chamaId/members/:memberId', memberController.getMemberDetails);

// Meeting management
router.post('/:chamaId/meetings', meetingController.createMeeting);
router.get('/:chamaId/meetings', meetingController.getMeetings);
router.get('/:chamaId/meetings/history', meetingController.getMeetingHistory);
router.post('/:chamaId/meetings/:meetingId/attendance', meetingController.recordAttendance);

// Chairperson dashboard
const chairpersonDashboard = require('../../controllers/chairpersonDashboardController');
router.get('/:chamaId/chairperson/dashboard', chairpersonDashboard.getChairpersonDashboard);

module.exports = router;

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { requireActiveChama } = require('../../middleware/inactivityCheck');
const { 
    createMeeting, 
    getMeetings, 
    getMeeting, 
    updateMeeting, 
    deleteMeeting,
    recordAttendance 
} = require('../../controllers/meetingController');

// All routes require authentication
router.use(verifyToken);

// Meeting minutes
router.post('/chamas/:chamaId/meetings', requireActiveChama, createMeeting);
router.get('/chamas/:chamaId/meetings', getMeetings);
router.get('/chamas/:chamaId/meetings/:meetingId', getMeeting);
router.put('/chamas/:chamaId/meetings/:meetingId', updateMeeting);
router.delete('/chamas/:chamaId/meetings/:meetingId', deleteMeeting);

// Attendance
router.post('/chamas/:chamaId/meetings/:meetingId/attendance', requireActiveChama, recordAttendance);

module.exports = router;

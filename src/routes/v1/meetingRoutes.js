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
    recordAttendance,
    getMeetingAttendance,
    getMemberAttendanceHistory,
    generateAttendanceReport
} = require('../../controllers/meetingController');

// All meeting routes require authentication and active chama
router.use(verifyToken);
router.use(requireActiveChama);

// Meeting minutes CRUD
router.post('/chamas/:chamaId/meetings', createMeeting);
router.get('/chamas/:chamaId/meetings', getMeetings);
router.get('/chamas/:chamaId/meetings/:meetingId', getMeeting);
router.put('/chamas/:chamaId/meetings/:meetingId', updateMeeting);
router.delete('/chamas/:chamaId/meetings/:meetingId', deleteMeeting);

// Attendance routes
router.post('/chamas/:chamaId/meetings/:meetingId/attendance', recordAttendance);
router.get('/chamas/:chamaId/meetings/:meetingId/attendance', getMeetingAttendance);
router.get('/chamas/:chamaId/attendance/member', getMemberAttendanceHistory);
router.get('/chamas/:chamaId/attendance/report', generateAttendanceReport);

module.exports = router;

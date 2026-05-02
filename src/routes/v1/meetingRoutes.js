const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { upload, createMeeting, getMeetings, getMeeting, recordAttendance } = require('../../controllers/meetingController');

// All routes require authentication
router.use(verifyToken);

// Meeting minutes
router.post('/chamas/:chamaId/meetings', upload.array('files', 10), createMeeting);
router.get('/chamas/:chamaId/meetings', getMeetings);
router.get('/chamas/:chamaId/meetings/:meetingId', getMeeting);

// Attendance
router.post('/chamas/:chamaId/meetings/:meetingId/attendance', recordAttendance);

module.exports = router;

// Meeting Minutes Controller
const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/meetings');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed'));
        }
    }
});

// Create meeting minutes
const createMeeting = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { title, content, meeting_date, start_time, end_time, location } = req.body;

        // Verify user is secretary or chairperson
        const roleCheck = await query(
            `SELECT id, role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true
             AND role IN ('secretary', 'assistant_secretary', 'chairperson')`,
            [chamaId, userId]
        );

        if (roleCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Only secretary or chairperson can create meetings',
                code: 403
            });
        }

        const secretaryId = roleCheck.rows[0].id;
        
        // Handle file uploads
        const photos = [];
        const documents = [];
        
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const fileUrl = `${process.env.BASE_URL || 'http://localhost:8080'}/uploads/meetings/${file.filename}`;
                if (file.mimetype.startsWith('image/')) {
                    photos.push(fileUrl);
                } else {
                    documents.push(fileUrl);
                }
            });
        }

        const result = await query(
            `INSERT INTO meeting_minutes (chama_id, secretary_id, title, content, meeting_date, start_time, end_time, location, photos, documents)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, title, meeting_date, created_at`,
            [chamaId, secretaryId, title, content, meeting_date, start_time, end_time, location, photos, documents]
        );

        res.status(201).json({
            success: true,
            message: 'Meeting minutes created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ success: false, message: 'Failed to create meeting', code: 500 });
    }
};

// Get all meetings for a chama
const getMeetings = async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const meetings = await query(
            `SELECT m.id, m.title, m.content, m.meeting_date, m.start_time, m.end_time, 
                    m.location, m.photos, m.documents, m.created_at,
                    u.full_name as secretary_name
             FROM meeting_minutes m
             JOIN group_members gm ON m.secretary_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE m.chama_id = $1
             ORDER BY m.meeting_date DESC`,
            [chamaId]
        );

        res.json({ success: true, data: meetings.rows });

    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ success: false, message: 'Failed to get meetings', code: 500 });
    }
};

// Get single meeting
const getMeeting = async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        
        const meeting = await query(
            `SELECT m.*, u.full_name as secretary_name
             FROM meeting_minutes m
             JOIN group_members gm ON m.secretary_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE m.id = $1 AND m.chama_id = $2`,
            [meetingId, chamaId]
        );

        if (meeting.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Meeting not found', code: 404 });
        }

        res.json({ success: true, data: meeting.rows[0] });

    } catch (error) {
        console.error('Get meeting error:', error);
        res.status(500).json({ success: false, message: 'Failed to get meeting', code: 500 });
    }
};

// Record attendance
const recordAttendance = async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        const { member_id, status, arrived_at, notes } = req.body;

        const result = await query(
            `INSERT INTO meeting_attendance (meeting_id, member_id, status, arrived_at, notes)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (meeting_id, member_id) 
             DO UPDATE SET status = EXCLUDED.status, arrived_at = EXCLUDED.arrived_at, notes = EXCLUDED.notes
             RETURNING *`,
            [meetingId, member_id, status || 'present', arrived_at, notes]
        );

        res.json({
            success: true,
            message: 'Attendance recorded',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Record attendance error:', error);
        res.status(500).json({ success: false, message: 'Failed to record attendance', code: 500 });
    }
};

module.exports = { upload, createMeeting, getMeetings, getMeeting, recordAttendance };
const { recordActivity } = require('../middleware/inactivityCheck');

// Add to createMeeting function
await recordActivity(chamaId, 'meeting_created', userId);

// Add to recordAttendance function
await recordActivity(chamaId, 'attendance_recorded', userId);

const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create meeting minutes
const createMeeting = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { title, content, meeting_date, start_time, end_time, location } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT id, role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true
             AND role IN ('secretary', 'assistant_secretary', 'chairperson')`,
            [chamaId, userId]
        );

        if (roleCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only secretary or chairperson can create meetings' });
        }

        const secretaryId = roleCheck.rows[0].id;
        const result = await query(
            `INSERT INTO meeting_minutes (chama_id, secretary_id, title, content, meeting_date, start_time, end_time, location)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, title, meeting_date, created_at`,
            [chamaId, secretaryId, title, content, meeting_date, start_time, end_time, location]
        );

        await recordActivity(chamaId, 'meeting_created', userId);
        res.status(201).json({ success: true, message: 'Meeting minutes created', data: result.rows[0] });
    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all meetings
const getMeetings = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const meetings = await query(
            `SELECT m.id, m.title, m.content, m.meeting_date, m.start_time, m.end_time, m.location, m.created_at,
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
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get meeting history with pagination
const getMeetingHistory = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const meetings = await query(
            `SELECT m.id, m.title, m.meeting_date, m.start_time, m.end_time, m.location,
                    m.attendance_count, u.full_name as secretary_name,
                    COUNT(ma.id) as total_attendance
             FROM meeting_minutes m
             JOIN group_members gm ON m.secretary_id = gm.id
             JOIN users u ON gm.user_id = u.id
             LEFT JOIN meeting_attendance ma ON ma.meeting_id = m.id
             WHERE m.chama_id = $1
             GROUP BY m.id, u.full_name
             ORDER BY m.meeting_date DESC
             LIMIT $2 OFFSET $3`,
            [chamaId, limit, offset]
        );

        const total = await query(
            `SELECT COUNT(*) as count FROM meeting_minutes WHERE chama_id = $1`,
            [chamaId]
        );

        res.json({
            success: true,
            data: meetings.rows,
            pagination: {
                total: parseInt(total.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Get meeting history error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Record attendance
const recordAttendance = async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        const { member_id, status, arrived_at, notes } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true
             AND role IN ('secretary', 'assistant_secretary', 'chairperson')`,
            [chamaId, userId]
        );

        if (roleCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only secretary or chairperson can record attendance' });
        }

        const result = await query(
            `INSERT INTO meeting_attendance (meeting_id, member_id, status, arrived_at, notes, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (meeting_id, member_id)
             DO UPDATE SET status = EXCLUDED.status, arrived_at = EXCLUDED.arrived_at, notes = EXCLUDED.notes
             RETURNING *`,
            [meetingId, member_id, status || 'present', arrived_at, notes, userId]
        );

        const attendanceCount = await query(
            `SELECT COUNT(*) as count FROM meeting_attendance 
             WHERE meeting_id = $1 AND status = 'present'`,
            [meetingId]
        );

        await query(
            `UPDATE meeting_minutes SET attendance_count = $1 WHERE id = $2`,
            [attendanceCount.rows[0].count, meetingId]
        );

        await recordActivity(chamaId, 'attendance_recorded', userId);
        res.json({ success: true, message: 'Attendance recorded', data: result.rows[0] });
    } catch (error) {
        console.error('Record attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createMeeting, getMeetings, getMeetingHistory, recordAttendance };

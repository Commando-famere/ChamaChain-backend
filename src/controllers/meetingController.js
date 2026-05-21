const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create meeting minutes
const createMeeting = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { title, content, meeting_date, start_time, end_time, location } = req.body;
        
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
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }
        
        res.json({ success: true, data: meeting.rows[0] });
        
    } catch (error) {
        console.error('Get meeting error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update meeting
const updateMeeting = async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        const { title, content, meeting_date, start_time, end_time, location } = req.body;
        
        const result = await query(
            `UPDATE meeting_minutes 
             SET title = COALESCE($1, title),
                 content = COALESCE($2, content),
                 meeting_date = COALESCE($3, meeting_date),
                 start_time = COALESCE($4, start_time),
                 end_time = COALESCE($5, end_time),
                 location = COALESCE($6, location)
             WHERE id = $7 AND chama_id = $8
             RETURNING *`,
            [title, content, meeting_date, start_time, end_time, location, meetingId, chamaId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Meeting not found' });
        }
        
        res.json({ success: true, message: 'Meeting updated', data: result.rows[0] });
        
    } catch (error) {
        console.error('Update meeting error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete meeting
const deleteMeeting = async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        
        await query(`DELETE FROM meeting_minutes WHERE id = $1 AND chama_id = $2`, [meetingId, chamaId]);
        
        res.json({ success: true, message: 'Meeting deleted' });
        
    } catch (error) {
        console.error('Delete meeting error:', error);
        res.status(500).json({ success: false, message: error.message });
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
        
        await recordActivity(chamaId, 'attendance_recorded', req.user.id);
        
        res.json({ success: true, message: 'Attendance recorded', data: result.rows[0] });
        
    } catch (error) {
        console.error('Record attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createMeeting, getMeetings, getMeeting, updateMeeting, deleteMeeting, recordAttendance };

// Get attendance for a specific meeting
const getMeetingAttendance = async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        
        const result = await query(
            `SELECT ma.*, u.full_name, u.phone, gm.role
             FROM meeting_attendance ma
             JOIN users u ON ma.member_id = u.id
             JOIN group_members gm ON gm.user_id = u.id AND gm.chama_id = $1
             WHERE ma.meeting_id = $2
             ORDER BY 
                 CASE ma.status 
                     WHEN 'present' THEN 1
                     WHEN 'late' THEN 2
                     WHEN 'excused' THEN 3
                     WHEN 'absent' THEN 4
                 END`,
            [chamaId, meetingId]
        );
        
        // Get summary
        const summary = await query(
            `SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused
             FROM meeting_attendance 
             WHERE meeting_id = $1`,
            [meetingId]
        );
        
        res.json({ 
            success: true, 
            data: { 
                members: result.rows,
                summary: summary.rows[0]
            }
        });
    } catch (error) {
        console.error('Get meeting attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get member attendance history
const getMemberAttendanceHistory = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { member_id } = req.query;
        const userId = req.user.id;
        
        const targetMember = member_id || userId;
        
        const result = await query(
            `SELECT ma.*, mm.title, mm.meeting_date
             FROM meeting_attendance ma
             JOIN meeting_minutes mm ON ma.meeting_id = mm.id
             WHERE mm.chama_id = $1 AND ma.member_id = $2
             ORDER BY mm.meeting_date DESC
             LIMIT 20`,
            [chamaId, targetMember]
        );
        
        // Calculate attendance rate
        const totalMeetings = await query(
            `SELECT COUNT(*) as total FROM meeting_minutes WHERE chama_id = $1`,
            [chamaId]
        );
        
        const attendedMeetings = result.rows.filter(r => r.status === 'present').length;
        const attendanceRate = totalMeetings.rows[0].total > 0 
            ? (attendedMeetings / totalMeetings.rows[0].total * 100).toFixed(1) 
            : 0;
        
        res.json({ 
            success: true, 
            data: {
                attendance_history: result.rows,
                summary: {
                    total_meetings: parseInt(totalMeetings.rows[0].total),
                    attended: attendedMeetings,
                    attendance_rate: parseFloat(attendanceRate),
                    present: result.rows.filter(r => r.status === 'present').length,
                    late: result.rows.filter(r => r.status === 'late').length,
                    absent: result.rows.filter(r => r.status === 'absent').length,
                    excused: result.rows.filter(r => r.status === 'excused').length
                }
            }
        });
    } catch (error) {
        console.error('Get member attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate attendance report (Secretary/Chairperson only)
const generateAttendanceReport = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { start_date, end_date } = req.query;
        const userId = req.user.id;
        
        // Check if user is secretary or chairperson
        const roleCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (!['secretary', 'assistant_secretary', 'chairperson'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only secretary, assistant secretary, or chairperson can generate reports' 
            });
        }
        
        const result = await query(
            `SELECT 
                u.id, u.full_name, u.phone, gm.role,
                COUNT(CASE WHEN ma.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN ma.status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN ma.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN ma.status = 'excused' THEN 1 END) as excused_count,
                COUNT(ma.meeting_id) as total_meetings_attended
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             LEFT JOIN meeting_attendance ma ON ma.member_id = u.id
             LEFT JOIN meeting_minutes mm ON ma.meeting_id = mm.id
             WHERE gm.chama_id = $1 
                AND gm.is_active = true
                AND (mm.meeting_date BETWEEN $2::date AND $3::date OR mm.meeting_date IS NULL)
             GROUP BY u.id, u.full_name, u.phone, gm.role
             ORDER BY present_count DESC`,
            [chamaId, start_date || '1900-01-01', end_date || '3000-12-31']
        );
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Generate attendance report error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    createMeeting, 
    getMeetings, 
    getMeeting, 
    updateMeeting, 
    deleteMeeting,
    recordAttendance,
    getMeetingAttendance,
    getMemberAttendanceHistory,
    generateAttendanceReport
};

// Get attendance for a meeting
const getMeetingAttendance = async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        
        const result = await query(
            `SELECT ma.*, u.full_name, u.phone, gm.role
             FROM meeting_attendance ma
             JOIN users u ON ma.member_id = u.id
             JOIN group_members gm ON gm.user_id = u.id AND gm.chama_id = $1
             WHERE ma.meeting_id = $2
             ORDER BY 
                 CASE ma.status 
                     WHEN 'present' THEN 1
                     WHEN 'late' THEN 2
                     WHEN 'excused' THEN 3
                     WHEN 'absent' THEN 4
                 END`,
            [chamaId, meetingId]
        );
        
        const summary = await query(
            `SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused
             FROM meeting_attendance 
             WHERE meeting_id = $1`,
            [meetingId]
        );
        
        res.json({ 
            success: true, 
            data: { 
                members: result.rows,
                summary: summary.rows[0]
            }
        });
    } catch (error) {
        console.error('Get meeting attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get member attendance history
const getMemberAttendanceHistory = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { member_id } = req.query;
        const userId = req.user.id;
        
        const targetMember = member_id || userId;
        
        const result = await query(
            `SELECT ma.*, mm.title, mm.meeting_date
             FROM meeting_attendance ma
             JOIN meeting_minutes mm ON ma.meeting_id = mm.id
             WHERE mm.chama_id = $1 AND ma.member_id = $2
             ORDER BY mm.meeting_date DESC
             LIMIT 20`,
            [chamaId, targetMember]
        );
        
        const totalMeetings = await query(
            `SELECT COUNT(*) as total FROM meeting_minutes WHERE chama_id = $1`,
            [chamaId]
        );
        
        const attendedMeetings = result.rows.filter(r => r.status === 'present').length;
        const attendanceRate = totalMeetings.rows[0].total > 0 
            ? (attendedMeetings / totalMeetings.rows[0].total * 100).toFixed(1) 
            : 0;
        
        res.json({ 
            success: true, 
            data: {
                attendance_history: result.rows,
                summary: {
                    total_meetings: parseInt(totalMeetings.rows[0].total),
                    attended: attendedMeetings,
                    attendance_rate: parseFloat(attendanceRate),
                    present: result.rows.filter(r => r.status === 'present').length,
                    late: result.rows.filter(r => r.status === 'late').length,
                    absent: result.rows.filter(r => r.status === 'absent').length,
                    excused: result.rows.filter(r => r.status === 'excused').length
                }
            }
        });
    } catch (error) {
        console.error('Get member attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate attendance report
const generateAttendanceReport = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { start_date, end_date } = req.query;
        const userId = req.user.id;
        
        const roleCheck = await query(
            `SELECT role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (!['secretary', 'assistant_secretary', 'chairperson'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Only secretary, assistant secretary, or chairperson can generate reports' 
            });
        }
        
        const result = await query(
            `SELECT 
                u.id, u.full_name, u.phone, gm.role,
                COUNT(CASE WHEN ma.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN ma.status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN ma.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN ma.status = 'excused' THEN 1 END) as excused_count,
                COUNT(ma.meeting_id) as total_meetings_attended
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             LEFT JOIN meeting_attendance ma ON ma.member_id = u.id
             LEFT JOIN meeting_minutes mm ON ma.meeting_id = mm.id
             WHERE gm.chama_id = $1 
                AND gm.is_active = true
                AND (mm.meeting_date BETWEEN $2::date AND $3::date OR mm.meeting_date IS NULL)
             GROUP BY u.id, u.full_name, u.phone, gm.role
             ORDER BY present_count DESC`,
            [chamaId, start_date || '1900-01-01', end_date || '3000-12-31']
        );
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Generate attendance report error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    createMeeting, 
    getMeetings, 
    getMeeting, 
    updateMeeting, 
    deleteMeeting,
    recordAttendance,
    getMeetingAttendance,
    getMemberAttendanceHistory,
    generateAttendanceReport
};

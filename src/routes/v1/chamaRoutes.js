const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { query } = require('../../config/database');
const { createChama, confirmPayment, getUserChamas, getChama } = require('../../controllers/chamaController');

router.use(verifyToken);

// Core chama routes
router.post('/', createChama);
router.post('/confirm-payment', confirmPayment);
router.get('/', getUserChamas);
router.get('/:chamaId', getChama);

// Member management (chairperson only)
router.get('/:chamaId/members', async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can view all members' });
        }

        const members = await query(
            `SELECT u.id, u.full_name, u.phone, u.email, u.profile_picture_url,
                    gm.role, gm.chama_member_id, gm.joined_at,
                    COALESCE(mb.balance_usdt, 0) as balance
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             LEFT JOIN member_balances mb ON mb.member_id = u.id AND mb.chama_id = gm.chama_id
             WHERE gm.chama_id = $1 AND gm.is_active = true
             ORDER BY gm.role = 'chairperson' DESC, gm.joined_at ASC`,
            [chamaId]
        );

        res.json({ success: true, data: members.rows, total: members.rows.length });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:chamaId/members/:memberId/role', async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const { role } = req.body;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can update roles' });
        }

        await query(
            `UPDATE group_members SET role = $1 WHERE chama_id = $2 AND user_id = $3`,
            [role, chamaId, memberId]
        );

        res.json({ success: true, message: `Member role updated to ${role}` });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:chamaId/members/:memberId', async (req, res) => {
    try {
        const { chamaId, memberId } = req.params;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can remove members' });
        }

        await query(
            `UPDATE group_members SET is_active = false WHERE chama_id = $1 AND user_id = $2`,
            [chamaId, memberId]
        );

        res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Meeting management
router.post('/:chamaId/meetings', async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { title, content, meeting_date, start_time, end_time, location } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT id FROM group_members 
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

        res.status(201).json({ success: true, message: 'Meeting created', data: result.rows[0] });
    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:chamaId/meetings', async (req, res) => {
    try {
        const { chamaId } = req.params;
        
        const meetings = await query(
            `SELECT m.id, m.title, m.meeting_date, m.start_time, m.end_time, m.location,
                    m.attendance_count, u.full_name as secretary_name
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
});

router.post('/:chamaId/meetings/:meetingId/attendance', async (req, res) => {
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

        await query(
            `INSERT INTO meeting_attendance (meeting_id, member_id, status, arrived_at, notes, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (meeting_id, member_id)
             DO UPDATE SET status = EXCLUDED.status, arrived_at = EXCLUDED.arrived_at, notes = EXCLUDED.notes`,
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

        res.json({ success: true, message: 'Attendance recorded' });
    } catch (error) {
        console.error('Record attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:chamaId/meetings/:meetingId/attendance', async (req, res) => {
    try {
        const { chamaId, meetingId } = req.params;
        
        const attendance = await query(
            `SELECT ma.*, u.full_name, u.phone
             FROM meeting_attendance ma
             JOIN users u ON ma.member_id = u.id
             WHERE ma.meeting_id = $1
             ORDER BY 
                 CASE ma.status 
                     WHEN 'present' THEN 1
                     WHEN 'late' THEN 2
                     WHEN 'excused' THEN 3
                     WHEN 'absent' THEN 4
                 END`,
            [meetingId]
        );
        
        res.json({ success: true, data: attendance.rows });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Chairperson dashboard
router.get('/:chamaId/dashboard', async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;

        const chairCheck = await query(
            `SELECT id FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND role = 'chairperson' AND is_active = true`,
            [chamaId, userId]
        );

        if (chairCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only chairperson can access dashboard' });
        }

        const stats = await query(
            `SELECT 
                (SELECT COUNT(*) FROM group_members WHERE chama_id = $1 AND is_active = true) as total_members,
                (SELECT COUNT(*) FROM meeting_minutes WHERE chama_id = $1) as total_meetings,
                (SELECT COALESCE(SUM(amount), 0) FROM member_contributions WHERE chama_id = $1) as total_contributions,
                (SELECT COUNT(*) FROM withdrawal_approvals WHERE chama_id = $1 AND status = 'pending') as pending_withdrawals,
                (SELECT COUNT(*) FROM member_join_requests WHERE chama_id = $1 AND status = 'pending') as pending_members
            `,
            [chamaId]
        );

        const recentActivities = await query(
            `SELECT activity_type, activity_type, created_at
             FROM chama_activity_log
             WHERE chama_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [chamaId]
        );

        const upcomingMeetings = await query(
            `SELECT id, title, meeting_date, start_time, location
             FROM meeting_minutes
             WHERE chama_id = $1 AND meeting_date >= CURRENT_DATE
             ORDER BY meeting_date ASC
             LIMIT 5`,
            [chamaId]
        );

        res.json({
            success: true,
            data: {
                statistics: {
                    total_members: parseInt(stats.rows[0].total_members) || 0,
                    total_meetings: parseInt(stats.rows[0].total_meetings) || 0,
                    total_contributions: parseFloat(stats.rows[0].total_contributions) || 0,
                    pending_withdrawals: parseInt(stats.rows[0].pending_withdrawals) || 0,
                    pending_members: parseInt(stats.rows[0].pending_members) || 0
                },
                recent_activities: recentActivities.rows,
                upcoming_meetings: upcomingMeetings.rows
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

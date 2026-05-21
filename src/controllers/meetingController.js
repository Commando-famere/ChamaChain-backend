const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Get meeting history
const getMeetingHistory = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const meetings = await query(
            `SELECT m.id, m.title, m.meeting_date, m.start_time, m.end_time, m.location,
                    m.attendance_count, u.full_name as secretary_name
             FROM meeting_minutes m
             JOIN group_members gm ON m.secretary_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE m.chama_id = $1
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

module.exports = { getMeetingHistory };

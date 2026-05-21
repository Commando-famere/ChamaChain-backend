const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create succession table
const createSuccessionTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS chama_succession (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
            current_role VARCHAR(50) NOT NULL,
            current_member_id UUID NOT NULL REFERENCES users(id),
            deputy_member_id UUID REFERENCES users(id),
            handover_notes TEXT,
            handover_completed BOOLEAN DEFAULT false,
            handover_date DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
};

// Set deputy
const setDeputy = async (req, res) => {
    try {
        await createSuccessionTable();
        const { chamaId } = req.params;
        const { role, deputy_member_id } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (roleCheck.rows[0]?.role !== 'chairperson') {
            return res.status(403).json({ success: false, message: 'Only chairperson can set deputies' });
        }

        // Check if deputy is a member
        const memberCheck = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, deputy_member_id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Deputy must be a member' });
        }

        const result = await query(
            `INSERT INTO chama_succession (chama_id, current_role, current_member_id, deputy_member_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (chama_id, current_role) 
             DO UPDATE SET deputy_member_id = $4, updated_at = NOW()
             RETURNING *`,
            [chamaId, role, userId, deputy_member_id]
        );

        await recordActivity(chamaId, 'deputy_set', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Set deputy error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Complete handover
const completeHandover = async (req, res) => {
    try {
        await createSuccessionTable();
        const { chamaId } = req.params;
        const { role, handover_notes } = req.body;
        const userId = req.user.id;

        await query(
            `UPDATE chama_succession 
             SET handover_completed = true, handover_notes = $1, handover_date = NOW()
             WHERE chama_id = $2 AND current_role = $3 AND current_member_id = $4`,
            [handover_notes, chamaId, role, userId]
        );

        await recordActivity(chamaId, 'handover_completed', userId);
        res.json({ success: true, message: 'Handover completed successfully' });
    } catch (error) {
        console.error('Complete handover error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get succession plan
const getSuccessionPlan = async (req, res) => {
    try {
        await createSuccessionTable();
        const { chamaId } = req.params;
        const result = await query(
            `SELECT s.*, 
                    u.full_name as current_member_name,
                    d.full_name as deputy_name
             FROM chama_succession s
             JOIN users u ON s.current_member_id = u.id
             LEFT JOIN users d ON s.deputy_member_id = d.id
             WHERE s.chama_id = $1`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get succession plan error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { setDeputy, completeHandover, getSuccessionPlan };

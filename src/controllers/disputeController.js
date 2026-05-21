const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create dispute table if not exists
const createDisputeTable = async () => {
    await query(`
        CREATE TABLE IF NOT EXISTS chama_disputes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            chama_id UUID NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
            complainant_id UUID NOT NULL REFERENCES users(id),
            respondent_id UUID REFERENCES users(id),
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            status VARCHAR(30) DEFAULT 'pending',
            resolution TEXT,
            resolved_by UUID REFERENCES users(id),
            resolved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `);
};

// Create dispute
const createDispute = async (req, res) => {
    try {
        await createDisputeTable();
        const { chamaId } = req.params;
        const { respondent_id, title, description } = req.body;
        const userId = req.user.id;

        const result = await query(
            `INSERT INTO chama_disputes (chama_id, complainant_id, respondent_id, title, description, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING *`,
            [chamaId, userId, respondent_id, title, description]
        );

        await recordActivity(chamaId, 'dispute_created', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create dispute error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Resolve dispute (chairperson only)
const resolveDispute = async (req, res) => {
    try {
        await createDisputeTable();
        const { chamaId, disputeId } = req.params;
        const { resolution } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (roleCheck.rows[0]?.role !== 'chairperson') {
            return res.status(403).json({ success: false, message: 'Only chairperson can resolve disputes' });
        }

        await query(
            `UPDATE chama_disputes 
             SET status = 'resolved', resolution = $1, resolved_by = $2, resolved_at = NOW()
             WHERE id = $3 AND chama_id = $4`,
            [resolution, userId, disputeId, chamaId]
        );

        await recordActivity(chamaId, 'dispute_resolved', userId);
        res.json({ success: true, message: 'Dispute resolved' });
    } catch (error) {
        console.error('Resolve dispute error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all disputes
const getDisputes = async (req, res) => {
    try {
        await createDisputeTable();
        const { chamaId } = req.params;
        const result = await query(
            `SELECT d.*, 
                    c.full_name as complainant_name, 
                    r.full_name as respondent_name,
                    res.full_name as resolver_name
             FROM chama_disputes d
             JOIN users c ON d.complainant_id = c.id
             LEFT JOIN users r ON d.respondent_id = r.id
             LEFT JOIN users res ON d.resolved_by = res.id
             WHERE d.chama_id = $1
             ORDER BY d.created_at DESC`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get disputes error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createDispute, resolveDispute, getDisputes };

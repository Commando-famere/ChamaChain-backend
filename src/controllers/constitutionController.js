const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create or update constitution
const saveConstitution = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { title, content } = req.body;
        const userId = req.user.id;

        // Verify user is chairperson
        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (roleCheck.rows[0]?.role !== 'chairperson') {
            return res.status(403).json({ success: false, message: 'Only chairperson can modify constitution' });
        }

        // Get current version
        const current = await query(
            `SELECT MAX(version) as version FROM chama_constitution WHERE chama_id = $1`,
            [chamaId]
        );
        const newVersion = (current.rows[0].version || 0) + 1;

        const result = await query(
            `INSERT INTO chama_constitution (chama_id, title, content, version, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [chamaId, title, content, newVersion, userId]
        );

        await recordActivity(chamaId, 'constitution_updated', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Save constitution error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sign constitution
const signConstitution = async (req, res) => {
    try {
        const { chamaId, constitutionId } = req.params;
        const userId = req.user.id;

        const constitution = await query(
            `SELECT signed_by, version FROM chama_constitution WHERE id = $1 AND chama_id = $2`,
            [constitutionId, chamaId]
        );

        if (constitution.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Constitution not found' });
        }

        let signedBy = constitution.rows[0].signed_by || [];
        if (!signedBy.includes(userId)) {
            signedBy.push(userId);
        }

        await query(
            `UPDATE chama_constitution 
             SET signed_by = $1, signed_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(signedBy), constitutionId]
        );

        await recordActivity(chamaId, 'constitution_signed', userId);
        res.json({ success: true, message: 'Constitution signed successfully' });
    } catch (error) {
        console.error('Sign constitution error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get constitution
const getConstitution = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const result = await query(
            `SELECT * FROM chama_constitution WHERE chama_id = $1 ORDER BY version DESC LIMIT 1`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows[0] || null });
    } catch (error) {
        console.error('Get constitution error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { saveConstitution, signConstitution, getConstitution };

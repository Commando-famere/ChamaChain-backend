const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Add bank account
const addBankAccount = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { bank_name, account_number, account_name, signatories } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (roleCheck.rows[0]?.role !== 'chairperson') {
            return res.status(403).json({ success: false, message: 'Only chairperson can add bank accounts' });
        }

        // Check if this should be primary
        let isPrimary = false;
        if (signatories && signatories.length >= 2) {
            const existingPrimary = await query(
                `SELECT id FROM chama_bank_accounts WHERE chama_id = $1 AND is_primary = true`,
                [chamaId]
            );
            if (existingPrimary.rows.length === 0) {
                isPrimary = true;
            }
        }

        const result = await query(
            `INSERT INTO chama_bank_accounts (chama_id, bank_name, account_number, account_name, signatories, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [chamaId, bank_name, account_number, account_name, JSON.stringify(signatories || []), isPrimary]
        );

        await recordActivity(chamaId, 'bank_account_added', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Add bank account error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get bank accounts
const getBankAccounts = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const result = await query(
            `SELECT * FROM chama_bank_accounts WHERE chama_id = $1 AND is_active = true`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get bank accounts error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { addBankAccount, getBankAccounts };

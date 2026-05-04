
// Get withdrawal methods (exported separately)
const getWithdrawalMethods = async (req, res) => {
    res.json({
        success: true,
        data: {
            methods: [
                {
                    id: 'bank',
                    name: 'Bank Transfer',
                    fields: [
                        { name: 'bank_name', label: 'Bank Name', type: 'text', required: true },
                        { name: 'bank_account_name', label: 'Account Name', type: 'text', required: true },
                        { name: 'bank_account_number', label: 'Account Number', type: 'text', required: true }
                    ],
                    processing_time: '1-3 business days',
                    min_amount: 200,
                    fee: 25
                },
                {
                    id: 'mobile_money',
                    name: 'Mobile Money (M-Pesa/Airtel)',
                    fields: [
                        { name: 'mobile_network', label: 'Network', type: 'select', options: ['mpesa', 'airtel'], required: true },
                        { name: 'mobile_number', label: 'Phone Number', type: 'tel', required: true }
                    ],
                    processing_time: 'Instant - 30 minutes',
                    min_amount: 200,
                    fee: 25
                },
                {
                    id: 'crypto',
                    name: 'Crypto (USDT)',
                    fields: [
                        { name: 'crypto_address', label: 'Wallet Address', type: 'text', required: true },
                        { name: 'crypto_network', label: 'Network', type: 'select', options: ['TRC20', 'ERC20', 'BEP20'], required: true }
                    ],
                    processing_time: '15-30 minutes',
                    min_amount: 200,
                    fee: 'KES 25 + 0.5 USDT'
                }
            ]
        }
    });
};

const getWithdrawalHistory = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        
        const memberResult = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (memberResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member' });
        }
        
        const withdrawals = await query(
            `SELECT id, amount_usdt, amount_kes, withdrawal_fee_kes, withdrawal_method, 
                    bank_name, mobile_network, mobile_number, crypto_network,
                    status, created_at, approved_at, transaction_reference
             FROM transaction_ledger
             WHERE member_id = $1 AND transaction_type = 'withdrawal'
             ORDER BY created_at DESC`,
            [memberResult.rows[0].id]
        );
        
        res.json({ success: true, data: withdrawals.rows });
        
    } catch (error) {
        console.error('Get withdrawal history error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { 
    requestWithdrawal, 
    getPendingApprovals, 
    approveWithdrawal,
    getWithdrawalMethods,
    getWithdrawalHistory
};

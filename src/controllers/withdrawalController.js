const { query } = require('../config/database');
const { WITHDRAWAL_FEE_KES, WITHDRAWAL_METHODS } = require('../config/constants');
const { processWithdrawal } = require('../services/withdrawalService');
const bcrypt = require('bcryptjs');

// Helper: Verify admin PIN
async function verifyAdminPin(memberId, pin) {
    const result = await query(
        `SELECT pin_hash, failed_attempts, locked_until FROM admin_pins WHERE member_id = $1`,
        [memberId]
    );
    
    if (result.rows.length === 0) {
        return { success: false, message: 'PIN not set for this admin' };
    }
    
    const admin = result.rows[0];
    
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
        return { success: false, message: 'PIN locked. Try again later.' };
    }
    
    const isValid = await bcrypt.compare(pin, admin.pin_hash);
    
    if (!isValid) {
        const newAttempts = (admin.failed_attempts || 0) + 1;
        let lockedUntil = null;
        
        if (newAttempts >= 5) {
            lockedUntil = new Date();
            lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);
        }
        
        await query(
            `UPDATE admin_pins SET failed_attempts = $1, locked_until = $2 WHERE member_id = $3`,
            [newAttempts, lockedUntil, memberId]
        );
        
        return { success: false, message: `Invalid PIN. ${5 - newAttempts} attempts remaining.` };
    }
    
    await query(`UPDATE admin_pins SET failed_attempts = 0, locked_until = NULL WHERE member_id = $1`, [memberId]);
    
    return { success: true };
}

// Request withdrawal (member)
const requestWithdrawal = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { amount_kes, method, bank_name, bank_account_name, bank_account_number, mobile_network, mobile_number, crypto_address, crypto_network } = req.body;
        
        if (amount_kes < 200) {
            return res.status(400).json({ success: false, message: 'Minimum withdrawal is KES 200' });
        }
        
        const memberResult = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );
        
        if (memberResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a member' });
        }
        
        const memberId = memberResult.rows[0].id;
        const usdRate = 130;
        const amount_usdt = amount_kes / usdRate;
        const platformFeeKes = WITHDRAWAL_FEE_KES;
        
        const balanceResult = await query(
            `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount_usdt ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount_usdt ELSE 0 END), 0) as balance
             FROM transaction_ledger
             WHERE member_id = $1 AND status = 'approved'`,
            [memberId]
        );
        
        const balance = parseFloat(balanceResult.rows[0].balance);
        
        if (balance < amount_usdt) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. You have ${balance.toFixed(2)} USDT`
            });
        }
        
        let destination = '';
        if (method === 'bank') destination = `${bank_name} - ${bank_account_name}`;
        if (method === 'mobile_money') destination = `${mobile_network.toUpperCase()} ${mobile_number}`;
        if (method === 'crypto') destination = crypto_address;
        
        const withdrawalResult = await query(
            `INSERT INTO transaction_ledger 
             (chama_id, member_id, transaction_type, amount_usdt, amount_kes, withdrawal_fee_kes, 
              status, approval_status, requires_approval, destination_wallet, withdrawal_method,
              bank_name, bank_account_name, bank_account_number, mobile_network, mobile_number, crypto_network)
             VALUES ($1, $2, 'withdrawal', $3, $4, $5, 'pending', 'pending', true, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id`,
            [
                chamaId, memberId, amount_usdt, amount_kes, platformFeeKes,
                destination, method,
                bank_name || null, bank_account_name || null, bank_account_number || null,
                mobile_network || null, mobile_number || null, crypto_network || null
            ]
        );
        
        const withdrawalId = withdrawalResult.rows[0].id;
        
        await query(
            `INSERT INTO withdrawal_approvals (withdrawal_id, chama_id, member_id, amount_kes, method, destination, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [withdrawalId, chamaId, memberId, amount_kes, method, destination]
        );
        
        res.json({
            success: true,
            message: 'Withdrawal request submitted. Waiting for admin approval.',
            data: { withdrawal_id: withdrawalId, requested_amount: amount_kes, requires_approval: true, status: 'pending_approval' }
        });
        
    } catch (error) {
        console.error('Withdrawal request error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get pending approvals (admin only)
const getPendingApprovals = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        
        const adminCheck = await query(
            `SELECT id, role FROM group_members 
             WHERE chama_id = $1 AND user_id = $2 AND is_active = true
             AND role IN ('chairperson', 'treasurer', 'secretary')`,
            [chamaId, userId]
        );
        
        if (adminCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only admins can view pending approvals' });
        }
        
        const pending = await query(
            `SELECT wa.*, u.full_name as requester_name, u.phone as requester_phone,
                    (SELECT COUNT(*) FROM withdrawal_signatures WHERE approval_id = wa.id) as signatures_count
             FROM withdrawal_approvals wa
             JOIN group_members gm ON wa.member_id = gm.id
             JOIN users u ON gm.user_id = u.id
             WHERE wa.chama_id = $1 AND wa.status = 'pending'
             ORDER BY wa.created_at ASC`,
            [chamaId]
        );
        
        res.json({ success: true, data: pending.rows });
        
    } catch (error) {
        console.error('Get pending approvals error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Approve withdrawal (admin with PIN)
const approveWithdrawal = async (req, res) => {
    try {
        const { chamaId, approvalId } = req.params;
        const userId = req.user.id;
        const { pin } = req.body;
        
        if (!pin) {
            return res.status(400).json({ success: false, message: 'Admin PIN required' });
        }
        
        const adminResult = await query(
            `SELECT gm.id as member_id, gm.role FROM group_members gm
             WHERE gm.chama_id = $1 AND gm.user_id = $2 AND gm.is_active = true
             AND gm.role IN ('chairperson', 'treasurer', 'secretary')`,
            [chamaId, userId]
        );
        
        if (adminResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only admins can approve withdrawals' });
        }
        
        const adminId = adminResult.rows[0].member_id;
        const adminRole = adminResult.rows[0].role;
        
        const pinValid = await verifyAdminPin(adminId, pin);
        if (!pinValid.success) {
            return res.status(401).json({ success: false, message: pinValid.message });
        }
        
        const existingSig = await query(
            `SELECT id FROM withdrawal_signatures WHERE approval_id = $1 AND admin_id = $2`,
            [approvalId, adminId]
        );
        
        if (existingSig.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'You have already approved this withdrawal' });
        }
        
        const hashedPin = await bcrypt.hash(pin, 10);
        await query(
            `INSERT INTO withdrawal_signatures (approval_id, admin_id, admin_role, pin_hash)
             VALUES ($1, $2, $3, $4)`,
            [approvalId, adminId, adminRole, hashedPin]
        );
        
        const signatures = await query(
            `SELECT admin_role FROM withdrawal_signatures WHERE approval_id = $1`,
            [approvalId]
        );
        
        const rolesSigned = signatures.rows.map(s => s.admin_role);
        const requiredRoles = ['chairperson', 'treasurer', 'secretary'];
        const allApproved = requiredRoles.every(role => rolesSigned.includes(role));
        
        if (allApproved) {
            await query(`UPDATE withdrawal_approvals SET status = 'approved', processed_at = NOW() WHERE id = $1`, [approvalId]);
            
            const withdrawal = await query(
                `SELECT wa.*, tl.id as transaction_id
                 FROM withdrawal_approvals wa
                 JOIN transaction_ledger tl ON wa.withdrawal_id = tl.id
                 WHERE wa.id = $1`,
                [approvalId]
            );
            
            const wd = withdrawal.rows[0];
            const amountAfterFee = wd.amount_kes - WITHDRAWAL_FEE_KES;
            const usdRate = 130;
            const amountToSend = amountAfterFee / usdRate;
            
            let processResult;
            if (wd.method === 'crypto') {
                const { sendToBybit } = require('../services/bybitService');
                processResult = await sendToBybit({
                    amount: amountToSend,
                    currency: 'USDT',
                    destination: wd.destination,
                    network_fee: 0.5
                });
            } else {
                processResult = await processWithdrawal(wd.method, wd.amount_kes, {
                    bank_name: wd.bank_name,
                    account_name: wd.bank_account_name,
                    account_number: wd.bank_account_number,
                    network: wd.mobile_network,
                    phone_number: wd.mobile_number,
                    address: wd.destination
                });
            }
            
            if (processResult.success) {
                await query(
                    `UPDATE transaction_ledger 
                     SET status = 'approved', approval_status = 'approved', approved_at = NOW(),
                         bybit_tx_hash = $1, transaction_reference = $2
                     WHERE id = $3`,
                    [processResult.transaction_hash || null, processResult.reference || null, wd.transaction_id]
                );
                
                res.json({
                    success: true,
                    message: 'Withdrawal fully approved and processed!',
                    data: { withdrawal_id: wd.transaction_id, requested_amount: wd.amount_kes, platform_fee: WITHDRAWAL_FEE_KES, status: 'approved', transaction_hash: processResult.transaction_hash }
                });
            } else {
                await query(`UPDATE transaction_ledger SET status = 'failed' WHERE id = $1`, [wd.transaction_id]);
                res.status(500).json({ success: false, message: 'Withdrawal processing failed', error: processResult.error });
            }
        } else {
            res.json({
                success: true,
                message: `Approval recorded. Waiting for additional approvals. (${signatures.rows.length}/3)`,
                data: { approvals_received: signatures.rows.length, approvals_needed: 3, remaining: requiredRoles.filter(r => !rolesSigned.includes(r)) }
            });
        }
        
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get withdrawal methods
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

// Get withdrawal history
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

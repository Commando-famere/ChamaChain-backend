const { query } = require('../config/database');
const { WITHDRAWAL_FEE_KES, WITHDRAWAL_METHODS } = require('../config/constants');
const { processWithdrawal } = require('../services/withdrawalService');

const requestWithdrawal = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const userId = req.user.id;
        const { 
            amount_kes, 
            method,
            bank_name,
            bank_account_name,
            bank_account_number,
            mobile_network,
            mobile_number,
            crypto_address,
            crypto_network
        } = req.body;
        
        if (!Object.values(WITHDRAWAL_METHODS).includes(method)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid withdrawal method. Use: bank, mobile_money, or crypto'
            });
        }
        
        if (amount_kes < 200) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal is KES 200'
            });
        }
        
        if (method === 'bank' && (!bank_name || !bank_account_name || !bank_account_number)) {
            return res.status(400).json({
                success: false,
                message: 'Bank details required'
            });
        }
        
        if (method === 'mobile_money' && (!mobile_network || !mobile_number)) {
            return res.status(400).json({
                success: false,
                message: 'Mobile money details required'
            });
        }
        
        if (method === 'crypto' && !crypto_address) {
            return res.status(400).json({
                success: false,
                message: 'Crypto address required'
            });
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
        const amountAfterPlatformFee = amount_kes - platformFeeKes;
        const amountToSendCrypto = amountAfterPlatformFee / usdRate;
        
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
                message: `Insufficient balance. You have ${balance.toFixed(2)} USDT, need ${amount_usdt.toFixed(2)} USDT`
            });
        }
        
        let withdrawalDetails = {};
        let destinationDisplay = '';
        
        switch (method) {
            case 'bank':
                withdrawalDetails = {
                    bank_name,
                    account_name: bank_account_name,
                    account_number: bank_account_number
                };
                destinationDisplay = `${bank_name} - ${bank_account_name}`;
                break;
            case 'mobile_money':
                withdrawalDetails = {
                    network: mobile_network,
                    phone_number: mobile_number
                };
                destinationDisplay = `${mobile_network.toUpperCase()} ${mobile_number}`;
                break;
            case 'crypto':
                withdrawalDetails = {
                    address: crypto_address,
                    network: crypto_network || 'TRC20'
                };
                destinationDisplay = `${crypto_address.substring(0, 10)}...`;
                break;
        }
        
        const withdrawalResult = await query(
            `INSERT INTO transaction_ledger 
             (chama_id, member_id, transaction_type, amount_usdt, amount_kes, withdrawal_fee_kes, 
              status, destination_wallet, withdrawal_method, bank_name, bank_account_name, bank_account_number,
              mobile_network, mobile_number, crypto_network)
             VALUES ($1, $2, 'withdrawal', $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id`,
            [
                chamaId, memberId, amount_usdt, amount_kes, platformFeeKes,
                method === 'crypto' ? crypto_address : destinationDisplay,
                method,
                method === 'bank' ? bank_name : null,
                method === 'bank' ? bank_account_name : null,
                method === 'bank' ? bank_account_number : null,
                method === 'mobile_money' ? mobile_network : null,
                method === 'mobile_money' ? mobile_number : null,
                method === 'crypto' ? crypto_network : null
            ]
        );
        
        const withdrawalId = withdrawalResult.rows[0].id;
        
        let processResult;
        
        if (method === 'crypto') {
            processResult = await processWithdrawal(method, amountToSendCrypto, withdrawalDetails);
        } else {
            processResult = await processWithdrawal(method, amount_kes, withdrawalDetails);
        }
        
        if (processResult.success) {
            await query(
                `UPDATE transaction_ledger 
                 SET status = 'approved', 
                     approved_at = NOW(),
                     bybit_tx_hash = $1,
                     transaction_reference = $2
                 WHERE id = $3`,
                [processResult.transaction_hash || null, processResult.reference || null, withdrawalId]
            );
            
            res.json({
                success: true,
                message: `Withdrawal of KES ${amount_kes} processed successfully via ${method}`,
                data: {
                    withdrawal_id: withdrawalId,
                    requested_amount: amount_kes,
                    platform_fee: platformFeeKes,
                    method: method,
                    destination: destinationDisplay,
                    reference: processResult.reference,
                    status: 'approved'
                }
            });
        } else {
            await query(`UPDATE transaction_ledger SET status = 'failed' WHERE id = $1`, [withdrawalId]);
            
            res.status(500).json({
                success: false,
                message: 'Withdrawal processing failed',
                error: processResult.error
            });
        }
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

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

module.exports = { requestWithdrawal, getWithdrawalMethods, getWithdrawalHistory };

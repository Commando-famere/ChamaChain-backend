const crypto = require('crypto');
const axios = require('axios');

const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;
const BASE_URL = process.env.BYBIT_BASE_URL || 'https://api.bybit.com';
const RECV_WINDOW = 5000;

// Generate signature for Bybit API
function generateSignature(params, timestamp, recvWindow, apiSecret) {
    const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    const signaturePayload = `${timestamp}${API_KEY}${recvWindow}${queryString}`;
    return crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
}

// Get wallet balance
async function getWalletBalance(coin = 'USDT') {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = RECV_WINDOW;
        
        const params = { coin: coin };
        const queryString = `coin=${coin}`;
        
        const signature = crypto
            .createHmac('sha256', API_SECRET)
            .update(`${timestamp}${API_KEY}${recvWindow}${queryString}`)
            .digest('hex');
        
        const response = await axios.get(
            `${BASE_URL}/v5/account/wallet-balance`,
            {
                headers: {
                    'X-BAPI-API-KEY': API_KEY,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-RECV-WINDOW': recvWindow
                }
            }
        );
        
        if (response.data && response.data.result) {
            const usdtBalance = response.data.result.list[0]?.coin?.find(c => c.coin === 'USDT');
            return {
                success: true,
                balance: usdtBalance?.walletBalance || 0,
                available: usdtBalance?.availableToWithdraw || 0
            };
        }
        
        return { success: false, error: 'Failed to get balance' };
        
    } catch (error) {
        console.error('Get balance error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// Withdraw USDT to external wallet
async function withdrawToWallet(amount, address, chain = 'TRC20') {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = RECV_WINDOW;
        
        // Generate unique withdrawal ID
        const withdrawId = `WD-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        const params = {
            coin: 'USDT',
            chain: chain,
            address: address,
            amount: amount.toFixed(8),
            timestamp: timestamp,
            withdrawId: withdrawId
        };
        
        const signature = generateSignature(params, timestamp, recvWindow, API_SECRET);
        
        const response = await axios.post(
            `${BASE_URL}/v5/asset/withdraw`,
            params,
            {
                headers: {
                    'X-BAPI-API-KEY': API_KEY,
                    'X-BAPI-TIMESTAMP': timestamp,
                    'X-BAPI-SIGN': signature,
                    'X-BAPI-RECV-WINDOW': recvWindow,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data && response.data.result) {
            return {
                success: true,
                withdrawal_id: response.data.result.withdrawId,
                transaction_hash: response.data.result.txID,
                amount: amount,
                fee: response.data.result.fee || 0.5
            };
        }
        
        return { success: false, error: response.data?.retMsg || 'Withdrawal failed' };
        
    } catch (error) {
        console.error('Withdrawal error:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

// Send to Bybit (wrapper for withdrawal)
async function sendToBybit(params) {
    const { amount, currency, destination, network_fee } = params;
    
    // Check balance first
    const balance = await getWalletBalance(currency);
    if (!balance.success) {
        return { success: false, error: 'Failed to check balance' };
    }
    
    if (balance.available < amount) {
        return { 
            success: false, 
            error: `Insufficient balance. Available: ${balance.available} ${currency}, Required: ${amount} ${currency}`
        };
    }
    
    // Process withdrawal
    const withdrawal = await withdrawToWallet(amount, destination, 'TRC20');
    
    return {
        success: withdrawal.success,
        tx_hash: withdrawal.transaction_hash,
        network_fee: network_fee,
        amount_sent: amount,
        withdrawal_id: withdrawal.withdrawal_id
    };
}

module.exports = { sendToBybit, getWalletBalance, withdrawToWallet };

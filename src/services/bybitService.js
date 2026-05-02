// Bybit Crypto Payment Integration - REAL API
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

// Create a real payment request on Bybit
async function createPaymentRequest(amount, currency, orderId, memberName) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = RECV_WINDOW;
        
        const params = {
            order_id: orderId,
            amount: amount.toString(),
            currency: currency,
            type: 'deposit',
            description: `Chama contribution from ${memberName}`,
            expire_time: (Date.now() + 30 * 60 * 1000).toString(),
            redirect_url: `${process.env.BASE_URL}/payment/callback`,
            notify_url: `${process.env.BASE_URL}/api/v1/crypto/webhook`
        };
        
        const signature = generateSignature(params, timestamp, recvWindow, API_SECRET);
        
        const response = await axios.post(
            `${BASE_URL}/v5/payment/create`,
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
                payment_link: response.data.result.checkout_url,
                qr_code: response.data.result.qr_code,
                expires_at: new Date(parseInt(params.expire_time)).toISOString()
            };
        }
        
        throw new Error(response.data.retMsg || 'Payment creation failed');
        
    } catch (error) {
        console.error('Bybit API error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.retMsg || error.message };
    }
}

// Verify real payment status
async function verifyPayment(orderId) {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = RECV_WINDOW;
        
        const params = { order_id: orderId };
        const queryString = `order_id=${orderId}`;
        const signature = crypto
            .createHmac('sha256', API_SECRET)
            .update(`${timestamp}${API_KEY}${recvWindow}${queryString}`)
            .digest('hex');
        
        const response = await axios.get(
            `${BASE_URL}/v5/payment/query?order_id=${orderId}`,
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
            const payment = response.data.result;
            const isPaid = payment.status === 'Paid';
            
            return {
                success: true,
                status: isPaid ? 'paid' : 'pending',
                transaction_hash: payment.tx_id,
                amount: payment.amount,
                paid_at: payment.paid_time
            };
        }
        
        return { success: false, status: 'pending' };
        
    } catch (error) {
        console.error('Verify payment error:', error.response?.data || error.message);
        return { success: false, status: 'pending', error: error.message };
    }
}

// Get USDT address for manual transfers
async function getDepositAddress() {
    try {
        const timestamp = Date.now().toString();
        const recvWindow = RECV_WINDOW;
        
        const params = { coin: 'USDT', chain: 'TRC20' };
        const queryString = `coin=USDT&chain=TRC20`;
        const signature = crypto
            .createHmac('sha256', API_SECRET)
            .update(`${timestamp}${API_KEY}${recvWindow}${queryString}`)
            .digest('hex');
        
        const response = await axios.get(
            `${BASE_URL}/v5/asset/deposit/address?coin=USDT&chain=TRC20`,
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
            return {
                success: true,
                address: response.data.result.address,
                chain: response.data.result.chain
            };
        }
        
        return { success: false, error: 'Failed to get deposit address' };
        
    } catch (error) {
        console.error('Get deposit address error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { createPaymentRequest, verifyPayment, getDepositAddress };

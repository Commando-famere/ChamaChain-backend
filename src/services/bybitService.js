// Bybit Crypto Payment Integration
// Note: You need to add BYBIT_API_KEY and BYBIT_API_SECRET to your .env

const crypto = require('crypto');
const axios = require('axios');

// Bybit API configuration
const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;
const BASE_URL = process.env.BYBIT_BASE_URL || 'https://api.bybit.com';

// Generate signature for Bybit API
function generateSignature(params, timestamp, recvWindow, apiSecret) {
    const queryString = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    const signaturePayload = `${timestamp}${API_KEY}${recvWindow}${queryString}`;
    return crypto.createHmac('sha256', apiSecret).update(signaturePayload).digest('hex');
}

// Create a payment request
async function createPaymentRequest(amount, currency, orderId, memberName) {
    try {
        // For demo purposes, return a mock payment link
        // In production, integrate with Bybit's payment API
        
        const paymentLink = `https://testnet.bybit.com/pay?amount=${amount}&currency=${currency}&orderId=${orderId}`;
        
        return {
            success: true,
            payment_link: paymentLink,
            qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentLink)}`,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        };
        
    } catch (error) {
        console.error('Create payment error:', error);
        return { success: false, error: error.message };
    }
}

// Verify payment
async function verifyPayment(orderId) {
    try {
        // In production, call Bybit API to verify payment
        // For demo, return mock verification
        return {
            success: true,
            status: 'paid',
            transaction_hash: '0x' + crypto.randomBytes(32).toString('hex')
        };
    } catch (error) {
        console.error('Verify payment error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { createPaymentRequest, verifyPayment };

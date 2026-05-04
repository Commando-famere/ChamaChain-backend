// Withdrawal Service - Bank, Mobile Money, Crypto
const axios = require('axios');
const crypto = require('crypto');

// Bank Transfer (simulated - integrate with real bank API)
async function processBankWithdrawal(amount, bankDetails) {
    try {
        const { bank_name, account_name, account_number } = bankDetails;
        
        console.log(`Processing bank withdrawal: KES ${amount} to ${account_name} (${bank_name})`);
        
        // In production, integrate with:
        // - Pesapal
        // - Flutterwave
        // - Direct bank API
        
        // For demo, simulate success
        return {
            success: true,
            reference: `BANK-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            message: `KES ${amount} sent to ${bank_name} account ${account_number}`
        };
        
    } catch (error) {
        console.error('Bank withdrawal error:', error);
        return { success: false, error: error.message };
    }
}

// Mobile Money (M-Pesa / Airtel)
async function processMobileMoneyWithdrawal(amount, mobileDetails) {
    try {
        const { network, phone_number } = mobileDetails;
        
        console.log(`Processing ${network} withdrawal: KES ${amount} to ${phone_number}`);
        
        // In production, integrate with:
        // - M-Pesa API (Safaricom)
        // - Airtel Money API
        
        // Simulate STK Push
        const stkReference = `MM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        return {
            success: true,
            reference: stkReference,
            message: `KES ${amount} sent to ${network} number ${phone_number}`,
            status: 'completed'
        };
        
    } catch (error) {
        console.error('Mobile money error:', error);
        return { success: false, error: error.message };
    }
}

// Crypto (Bybit)
async function processCryptoWithdrawal(amount, cryptoDetails) {
    try {
        const { address, network = 'TRC20' } = cryptoDetails;
        const { sendToBybit } = require('./bybitService');
        
        const result = await sendToBybit({
            amount: amount,
            currency: 'USDT',
            destination: address,
            network: network
        });
        
        return result;
        
    } catch (error) {
        console.error('Crypto withdrawal error:', error);
        return { success: false, error: error.message };
    }
}

// Main withdrawal handler
async function processWithdrawal(method, amount, details) {
    switch (method) {
        case 'bank':
            return await processBankWithdrawal(amount, details);
        case 'mobile_money':
            return await processMobileMoneyWithdrawal(amount, details);
        case 'crypto':
            return await processCryptoWithdrawal(amount, details);
        default:
            return { success: false, error: 'Invalid withdrawal method' };
    }
}

module.exports = { processWithdrawal };

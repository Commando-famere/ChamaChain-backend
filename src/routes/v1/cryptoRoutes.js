const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { 
    initiateContributionPayment, 
    paymentWebhook,
    verifyContributionPayment, 
    getPaymentHistory,
    simulatePaymentConfirmation
} = require('../../controllers/cryptoController');

// Protected routes (require auth)
router.use(verifyToken);

// Initiate crypto payment
router.post('/chamas/:chamaId/pay', initiateContributionPayment);

// Verify payment (auto-approves if confirmed)
router.get('/chamas/:chamaId/verify/:orderId', verifyContributionPayment);

// Payment history
router.get('/chamas/:chamaId/payments', getPaymentHistory);

// Simulate payment confirmation (for testing only - remove in production)
router.post('/simulate/:orderId/confirm', simulatePaymentConfirmation);

// Webhook for Bybit (no auth required, called by Bybit)
router.post('/webhook', paymentWebhook);

module.exports = router;

// Get USDT deposit address
router.get('/deposit-address', getDepositAddress);

// Cancel pending payment
router.delete('/cancel/:orderId', cancelPayment);

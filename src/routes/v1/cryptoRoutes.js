const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { initiateContributionPayment, verifyContributionPayment, getPaymentHistory } = require('../../controllers/cryptoController');

router.use(verifyToken);

// Initiate crypto payment
router.post('/chamas/:chamaId/pay', initiateContributionPayment);

// Verify payment
router.get('/chamas/:chamaId/verify/:orderId', verifyContributionPayment);

// Payment history
router.get('/chamas/:chamaId/payments', getPaymentHistory);

module.exports = router;

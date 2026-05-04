const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { createChama, confirmPayment, getUserChamas, getChama } = require('../../controllers/chamaController');

router.use(verifyToken);

// Create chama (may require payment)
router.post('/', createChama);

// Confirm payment and activate chama
router.post('/confirm-payment', confirmPayment);

// Get user's chamas
router.get('/', getUserChamas);

// Get chama details
router.get('/:chamaId', getChama);

module.exports = router;

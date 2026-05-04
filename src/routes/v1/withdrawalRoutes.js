const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { requestWithdrawal, getWithdrawalMethods, getWithdrawalHistory } = require('../../controllers/withdrawalController');

router.use(verifyToken);

// Get available withdrawal methods
router.get('/methods', getWithdrawalMethods);

// Request withdrawal
router.post('/chamas/:chamaId/withdraw', requestWithdrawal);

// Get withdrawal history
router.get('/chamas/:chamaId/history', getWithdrawalHistory);

module.exports = router;

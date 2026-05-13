const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { requireActiveChama } = require('../../middleware/inactivityCheck');
const { 
    recordDeposit, 
    approveDeposit,
    getChamaBalance,
    getMemberBalance,
    getTransactionHistory
} = require('../../controllers/financialController');

// All routes require authentication
router.use(verifyToken);

// Deposits
router.post('/chamas/:chamaId/deposits', requireActiveChama, recordDeposit);
router.post('/chamas/:chamaId/deposits/:depositId/approve', approveDeposit);

// Balance
router.get('/chamas/:chamaId/balance', getChamaBalance);
router.get('/chamas/:chamaId/members/:memberId/balance', getMemberBalance);

// Transactions
router.get('/chamas/:chamaId/transactions', getTransactionHistory);

module.exports = router;

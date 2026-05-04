const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { 
    requestWithdrawal, 
    getPendingApprovals, 
    approveWithdrawal 
} = require('../../controllers/withdrawalController');

// All routes require authentication
router.use(verifyToken);

// Get available withdrawal methods (uses the controller function)
router.get('/methods', require('../../controllers/withdrawalController').getWithdrawalMethods);

// Request withdrawal (member)
router.post('/chamas/:chamaId/withdraw', requestWithdrawal);

// Get pending approvals (admin only)
router.get('/chamas/:chamaId/approvals/pending', getPendingApprovals);

// Approve withdrawal with PIN (admin only)
router.post('/chamas/:chamaId/approvals/:approvalId/approve', approveWithdrawal);

// Get withdrawal history
router.get('/chamas/:chamaId/history', require('../../controllers/withdrawalController').getWithdrawalHistory);

module.exports = router;

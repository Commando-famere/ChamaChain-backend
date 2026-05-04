const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { setAdminPin } = require('../../controllers/adminPinController');
const { getPendingApprovals, approveWithdrawal } = require('../../controllers/withdrawalController');

router.use(verifyToken);

// Set admin PIN
router.post('/chamas/:chamaId/set-pin', setAdminPin);

// Get pending withdrawal approvals
router.get('/chamas/:chamaId/approvals/pending', getPendingApprovals);

// Approve withdrawal with PIN
router.post('/chamas/:chamaId/approvals/:approvalId/approve', approveWithdrawal);

module.exports = router;

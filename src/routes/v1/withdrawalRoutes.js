const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { requestWithdrawal } = require('../../controllers/withdrawalController');

router.use(verifyToken);

// Request withdrawal
router.post('/chamas/:chamaId/withdraw', requestWithdrawal);

module.exports = router;

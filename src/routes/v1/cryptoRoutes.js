const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.post('/chamas/:chamaId/pay', verifyToken, (req, res) => {
    res.json({ success: true, data: { order_id: 'test', amount: req.body.amount } });
});

module.exports = router;

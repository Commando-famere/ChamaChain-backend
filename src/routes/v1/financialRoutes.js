const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.use(verifyToken);
router.get('/chamas/:chamaId/balance', (req, res) => {
    res.json({ success: true, balance: 0 });
});

module.exports = router;

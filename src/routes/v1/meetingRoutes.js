const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.post('/chamas/:chamaId/meetings', verifyToken, (req, res) => {
    res.json({ success: true, message: 'Meeting created' });
});

router.get('/chamas/:chamaId/meetings', verifyToken, (req, res) => {
    res.json({ success: true, data: [] });
});

module.exports = router;

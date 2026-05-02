const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.get('/chamas/:chamaId/group', verifyToken, (req, res) => {
    res.json({ success: true, data: { conversation: {} } });
});

module.exports = router;

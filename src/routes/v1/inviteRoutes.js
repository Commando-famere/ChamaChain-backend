const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.post('/chamas/:chamaId/invite', verifyToken, (req, res) => {
    res.json({ success: true, data: { invite_link: 'http://test.com/invite' } });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');

router.get('/member/:chamaId', verifyToken, (req, res) => {
    res.json({ success: true, message: 'Member dashboard' });
});

router.get('/chairperson/:chamaId', verifyToken, (req, res) => {
    res.json({ success: true, message: 'Chairperson dashboard' });
});

router.get('/chairperson/:chamaId/rolling-settings', verifyToken, (req, res) => {
    res.json({ success: true, data: {} });
});

router.put('/chairperson/:chamaId/rolling-settings', verifyToken, (req, res) => {
    res.json({ success: true, message: 'Settings updated' });
});

module.exports = router;

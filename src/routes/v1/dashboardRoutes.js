const express = require('express');
const router = express.Router();

router.get('/member/:chamaId', (req, res) => {
    res.json({ success: true, data: { profile: { full_name: 'Test User' } } });
});

router.get('/chairperson/:chamaId', (req, res) => {
    res.json({ success: true, data: { members: [] } });
});

module.exports = router;

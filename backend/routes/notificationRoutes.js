/* Notification feed (list, mark read) */
const router = require('express').Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', auth, async (req, res) => {
    const items = await Notification.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(50);
    res.json(items);
});

router.post('/:id/read', auth, async (req, res) => {
    await Notification.updateOne({ id: req.params.id, user_id: req.user.id }, { $set: { is_read: true } });
    res.json({ status: 'ok' });
});

router.post('/read-all', auth, async (req, res) => {
    await Notification.updateMany({ user_id: req.user.id }, { $set: { is_read: true } });
    res.json({ status: 'ok' });
});

module.exports = router;

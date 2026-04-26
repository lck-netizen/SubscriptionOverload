/* Budget — monthly spend limit per user */
const router = require('express').Router();
const auth = require('../middleware/auth');
const Budget = require('../models/Budget');

router.get('/', auth, async (req, res) => {
    const b = await Budget.findOne({ user_id: req.user.id });
    res.json({ monthly_limit: b?.monthly_limit || 0 });
});

router.post('/', auth, async (req, res) => {
    const monthly_limit = Number(req.body.monthly_limit) || 0;
    await Budget.updateOne(
        { user_id: req.user.id },
        { $set: { monthly_limit } },
        { upsert: true }
    );
    res.json({ monthly_limit });
});

module.exports = router;

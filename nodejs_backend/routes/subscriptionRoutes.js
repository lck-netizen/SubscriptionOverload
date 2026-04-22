/* Subscription CRUD + "mark used" */
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
const { autoCategorize } = require('../services/categorize');

// GET /api/subscriptions
router.get('/', auth, async (req, res) => {
    const subs = await Subscription.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json(subs);
});

// POST /api/subscriptions
router.post('/', auth, async (req, res) => {
    const { service_name, cost, billing_cycle, renewal_date, category, notes, reminder_days } = req.body;
    const sub = await Subscription.create({
        id: uuidv4(),
        user_id: req.user.id,
        service_name,
        cost: Number(cost),
        billing_cycle: billing_cycle || 'monthly',
        renewal_date,
        category: category || autoCategorize(service_name),
        notes: notes || '',
        reminder_days: reminder_days ?? 3,
    });
    res.json(sub);
});

// PUT /api/subscriptions/:id
router.put('/:id', auth, async (req, res) => {
    const sub = await Subscription.findOne({ id: req.params.id, user_id: req.user.id });
    if (!sub) return res.status(404).json({ detail: 'Subscription not found' });
    Object.assign(sub, req.body);
    await sub.save();
    res.json(sub);
});

// DELETE /api/subscriptions/:id
router.delete('/:id', auth, async (req, res) => {
    const result = await Subscription.deleteOne({ id: req.params.id, user_id: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ detail: 'Subscription not found' });
    res.json({ status: 'deleted' });
});

// POST /api/subscriptions/:id/use
router.post('/:id/use', auth, async (req, res) => {
    const sub = await Subscription.findOne({ id: req.params.id, user_id: req.user.id });
    if (!sub) return res.status(404).json({ detail: 'Subscription not found' });
    sub.last_used = new Date();
    sub.usage_count += 1;
    await sub.save();
    res.json({ status: 'ok' });
});

module.exports = router;

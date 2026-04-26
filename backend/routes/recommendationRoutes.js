/* Rule-based optimization recommendations */
const router = require('express').Router();
const auth = require('../middleware/auth');
const Subscription = require('../models/Subscription');

const monthlyCost = (s) => {
    if (s.billing_cycle === 'yearly') return s.cost / 12;
    if (s.billing_cycle === 'weekly') return s.cost * 4.33;
    return s.cost;
};

router.get('/', auth, async (req, res) => {
    const subs = await Subscription.find({ user_id: req.user.id, status: 'active' });
    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const suggestions = [];

    for (const s of subs) {
        const cost = monthlyCost(s);

        // Rule 1: Unused 25+ days
        if (s.last_used) {
            const daysUnused = Math.floor((now - s.last_used) / 86400000);
            if (daysUnused >= 25) {
                suggestions.push({
                    type: 'cancel', severity: 'high', subscription_id: s.id,
                    service_name: s.service_name,
                    reason: `Unused for ${daysUnused} days — consider cancelling to save ₹${Math.round(cost)}/month.`,
                    saving: +cost.toFixed(2),
                });
            }
        } else if ((s.usage_count || 0) === 0) {
            const daysSinceAdd = Math.floor((now - s.created_at) / 86400000);
            if (daysSinceAdd >= 14) {
                suggestions.push({
                    type: 'cancel', severity: 'medium', subscription_id: s.id,
                    service_name: s.service_name,
                    reason: `No usage recorded in ${daysSinceAdd} days. Cancel to save ₹${Math.round(cost)}/month.`,
                    saving: +cost.toFixed(2),
                });
            }
        }

        // Rule 2: Premium spend
        if (cost > 500) {
            suggestions.push({
                type: 'downgrade', severity: 'low', subscription_id: s.id,
                service_name: s.service_name,
                reason: `Premium spend detected (₹${Math.round(cost)}/mo). Check for a cheaper tier.`,
                saving: +(cost * 0.3).toFixed(2),
            });
        }

        // Rule 3: Renewal soon
        const r = new Date(s.renewal_date);
        const daysLeft = Math.ceil((r - today) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 3) {
            suggestions.push({
                type: 'reminder', severity: 'high', subscription_id: s.id,
                service_name: s.service_name,
                reason: `Renews in ${daysLeft} days — review before being charged.`,
                saving: 0,
            });
        }
    }

    res.json({ suggestions });
});

module.exports = router;

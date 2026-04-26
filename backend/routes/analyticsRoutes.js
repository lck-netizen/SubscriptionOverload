/* Analytics — /summary and /forecast */
const router = require('express').Router();
const auth = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Budget = require('../models/Budget');

const monthlyCost = (s) => {
    if (s.billing_cycle === 'yearly') return s.cost / 12;
    if (s.billing_cycle === 'weekly') return s.cost * 4.33;
    return s.cost;
};

router.get('/summary', auth, async (req, res) => {
    const subs = await Subscription.find({ user_id: req.user.id, status: 'active' });

    const monthlyTotal = subs.reduce((sum, s) => sum + monthlyCost(s), 0);
    const yearlyTotal = monthlyTotal * 12;

    // category breakdown
    const catMap = {};
    subs.forEach((s) => {
        catMap[s.category] = (catMap[s.category] || 0) + monthlyCost(s);
    });
    const categoryBreakdown = Object.entries(catMap).map(([k, v]) => ({ category: k, amount: +v.toFixed(2) }));

    // upcoming renewals (next 30 days)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = [];
    for (const s of subs) {
        const r = new Date(s.renewal_date);
        const daysLeft = Math.ceil((r - today) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 30) {
            upcoming.push({
                id: s.id, service_name: s.service_name, cost: s.cost,
                renewal_date: s.renewal_date, days_left: daysLeft, category: s.category,
            });
        }
    }
    upcoming.sort((a, b) => a.days_left - b.days_left);

    const budget = await Budget.findOne({ user_id: req.user.id });
    const monthlyLimit = budget?.monthly_limit || 0;

    res.json({
        active_count: subs.length,
        monthly_total: +monthlyTotal.toFixed(2),
        yearly_total: +yearlyTotal.toFixed(2),
        category_breakdown: categoryBreakdown,
        upcoming_renewals: upcoming.slice(0, 10),
        monthly_limit: monthlyLimit,
        budget_used_pct: monthlyLimit > 0 ? +((monthlyTotal / monthlyLimit) * 100).toFixed(1) : 0,
        over_budget: monthlyLimit > 0 && monthlyTotal > monthlyLimit,
    });
});

router.get('/forecast', auth, async (req, res) => {
    const subs = await Subscription.find({ user_id: req.user.id, status: 'active' });
    const monthly = subs.reduce((sum, s) => sum + monthlyCost(s), 0);

    const today = new Date();
    const forecast = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        forecast.push({
            month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            projected: +monthly.toFixed(2),
        });
    }
    res.json({ forecast, monthly_avg: +monthly.toFixed(2) });
});

module.exports = router;

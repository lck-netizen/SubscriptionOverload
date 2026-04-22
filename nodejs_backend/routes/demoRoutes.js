/* Instant test-email route — used during live demos to trigger
   a sample renewal reminder email + in-app notification. */
const router = require('express').Router();
const auth = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const { sendRenewalEmail } = require('../services/email');
const { v4: uuidv4 } = require('uuid');

router.post('/send-test-email', auth, async (req, res) => {
    const latest = await Subscription.findOne({ user_id: req.user.id }).sort({ created_at: -1 });
    const demoSub = latest || {
        service_name: 'Netflix Premium',
        cost: 649,
        billing_cycle: 'monthly',
        renewal_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        category: 'OTT',
    };
    const daysLeft = 3;

    // In-app notification
    await Notification.create({
        id: uuidv4(),
        user_id: req.user.id,
        message: `[TEST] ${demoSub.service_name} renews in ${daysLeft} day(s) — ₹${demoSub.cost}`,
        type: 'reminder',
    });

    let emailStatus = 'skipped', emailError = null;
    if (process.env.RESEND_API_KEY) {
        try {
            await sendRenewalEmail(req.user.email, req.user.name, demoSub, daysLeft);
            emailStatus = 'sent';
        } catch (err) {
            emailStatus = 'failed';
            emailError = err.message;
        }
    } else {
        emailError = 'RESEND_API_KEY not configured';
    }

    res.json({
        email_status: emailStatus,
        email_to: req.user.email,
        email_error: emailError,
        notification_created: true,
        service_used: demoSub.service_name,
    });
});

module.exports = router;

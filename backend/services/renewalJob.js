/* Daily renewal-check cron job.
   For every active subscription whose renewal falls within the
   user-defined reminder window:
     - Create an in-app notification (de-duped within 24h)
     - Send a renewal email via Resend
*/
const Subscription = require('../models/Subscription');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendRenewalEmail } = require('./email');
const { v4: uuidv4 } = require('uuid');

async function runRenewalJob() {
    console.log('[cron] Running daily renewal check …');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = await Subscription.find({ status: 'active' });
    for (const sub of active) {
        const rdate = new Date(sub.renewal_date);
        const daysLeft = Math.ceil((rdate - today) / 86400000);
        const window = sub.reminder_days ?? 3;

        if (daysLeft >= 0 && daysLeft <= window) {
            // De-dupe: skip if we already notified in the last 24h
            const recent = await Notification.findOne({
                user_id: sub.user_id,
                type: 'reminder',
                message: new RegExp(sub.service_name, 'i'),
                created_at: { $gte: new Date(Date.now() - 86400000) },
            });
            if (recent) continue;

            await Notification.create({
                id: uuidv4(),
                user_id: sub.user_id,
                message: `${sub.service_name} renews in ${daysLeft} day(s) — ₹${sub.cost}`,
                type: 'reminder',
            });

            const user = await User.findOne({ id: sub.user_id });
            if (user) await sendRenewalEmail(user, sub, daysLeft);
        }
    }
}

module.exports = { runRenewalJob };

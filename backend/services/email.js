/* Resend email helper — sends HTML emails for renewal reminders. */
const { Resend } = require('resend');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendRenewalEmail(user, sub, daysLeft) {
    if (!process.env.RESEND_API_KEY || !resend) {
        console.log('[email] RESEND_API_KEY not set — skipping.');
        return;
    }
    
    const displayName = user.emailPreferences?.displayName || `${user.firstName} ${user.lastName}`;
    const toEmail = user.emailPreferences?.notificationEmail || user.email;
    const customFooter = user.emailPreferences?.customFooter || '';
    
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0A0A0A">
      <h2 style="color:#002FA7;margin:0 0 16px 0">Renewal Reminder</h2>
      <p>Hi ${displayName},</p>
      <p>Your <strong>${sub.service_name}</strong> subscription will renew in
         <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>
         for <strong>₹${sub.cost}</strong>.</p>
      <p style="padding:12px 16px;background:#F9F9F9;border:1px solid #E5E7EB;border-radius:6px">
         Category: ${sub.category} | Billing: ${sub.billing_cycle}<br/>
         Renewal date: ${sub.renewal_date}
      </p>
      <p style="color:#52525B">If you no longer use this service, log in to cancel before the charge.</p>
      ${customFooter ? `<p style="padding-top:12px;color:#52525B;font-size:14px">${customFooter}</p>` : ''}
      <p style="margin-top:24px;color:#A1A1AA;font-size:12px">— Subscription Overload Manager</p>
    </div>`;

    try {
        await resend.emails.send({
            from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
            to: [toEmail],
            subject: `${sub.service_name} renews in ${daysLeft} day(s)`,
            html,
        });
        console.log(`[email] Sent renewal reminder to ${toEmail}`);
    } catch (err) {
        console.error('[email] Failed:', err.message);
    }
}

module.exports = { sendRenewalEmail };

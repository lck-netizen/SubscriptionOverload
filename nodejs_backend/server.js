/* ============================================================
   EXPRESS ENTRYPOINT
   - Connects to MongoDB via Mongoose
   - Mounts /api routes
   - Starts the daily renewal-check cron job
   ============================================================ */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const subRoutes = require('./routes/subscriptionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const notifRoutes = require('./routes/notificationRoutes');
const { runRenewalJob } = require('./services/renewalJob');

const app = express();

// --- Middleware ---
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// --- DB connection ---
connectDB();

// --- Routes (all prefixed with /api) ---
app.get('/api', (req, res) => res.json({ message: 'Subscription Overload Manager API is running.' }));
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/recommendations', require('./routes/recommendationRoutes'));

// --- Scheduler: every day at 09:00 UTC, check renewals & send emails ---
cron.schedule('0 9 * * *', runRenewalJob, { timezone: 'UTC' });
// Also run once at startup
runRenewalJob().catch(console.error);

// --- Start the HTTP server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✓ Server listening on :${PORT}`));

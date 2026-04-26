/* Subscription schema — one per tracked service */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const SubscriptionSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    service_name: { type: String, required: true },
    cost: { type: Number, required: true },
    billing_cycle: { type: String, enum: ['monthly', 'yearly', 'weekly'], default: 'monthly' },
    renewal_date: { type: String, required: true },   // YYYY-MM-DD
    category: { type: String, default: 'Other' },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    notes: { type: String, default: '' },
    reminder_days: { type: Number, default: 3 },
    last_used: { type: Date, default: null },
    usage_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);

/* In-app notifications (renewal reminders, suggestions, alerts) */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const NotificationSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['reminder', 'suggestion', 'alert'], default: 'reminder' },
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);

/* User schema — stores hashed password (bcrypt) */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: '' },
    country: { type: String, default: '' },
    password_hash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    emailPreferences: {
        displayName: { type: String, default: '' },
        notificationEmail: { type: String, default: '' },
        customFooter: { type: String, default: '' },
    },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);

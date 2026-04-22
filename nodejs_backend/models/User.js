/* User schema — stores hashed password (bcrypt) */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);

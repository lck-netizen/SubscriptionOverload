/* One budget per user (monthly limit in ₹) */
const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    monthly_limit: { type: Number, default: 0 },
});

module.exports = mongoose.model('Budget', BudgetSchema);

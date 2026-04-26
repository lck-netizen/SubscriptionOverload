/* OTT Platform schema — manages streaming and subscription platforms */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const OTTSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, unique: true, index: true },
    name: { type: String, required: true },
    logo: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { 
        type: String, 
        enum: ['Streaming', 'Music', 'Cloud Storage', 'Productivity', 'Gaming', 'News', 'Education', 'Fitness', 'Other'],
        default: 'Other'
    },
    pricingTiers: [{
        name: { type: String, required: true },
        price: { type: Number, required: true },
        features: [{ type: String }],
    }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    popularity: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OTT', OTTSchema);

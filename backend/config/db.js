/* MongoDB connection helper — uses Mongoose ORM.
   MONGO_URL comes from .env */
const mongoose = require('mongoose');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✓ MongoDB connected');
    } catch (err) {
        console.error('✗ MongoDB connection error:', err.message);
        process.exit(1);
    }
}

module.exports = connectDB;

/* Admin middleware - checks if user has admin privileges */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ detail: 'No token provided' });
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findOne({ id: decoded.id });
        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }
        if (!user.isAdmin) {
            return res.status(403).json({ detail: 'Admin access required' });
        }
        req.user = { id: user.id, email: user.email, isAdmin: user.isAdmin };
        next();
    } catch {
        return res.status(401).json({ detail: 'Invalid token' });
    }
};

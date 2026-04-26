/* JWT auth middleware.
   Reads `Authorization: Bearer <token>`, verifies it, attaches
   req.user (from DB). Sends 401 on failure. */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ detail: 'Missing auth token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ id: decoded.user_id });
        if (!user) return res.status(401).json({ detail: 'User not found' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ detail: 'Invalid or expired token' });
    }
};

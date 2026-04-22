/* Auth routes — register / login / me */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');

function signToken(userId) {
    return jwt.sign({ user_id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });
}

function publicUser(u) {
    return { id: u.id, name: u.name, email: u.email, created_at: u.created_at };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
        return res.status(400).json({ detail: 'Invalid payload' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const user = await User.create({ id: userId, name, email: email.toLowerCase(), password_hash: hash });
    await Budget.create({ user_id: userId, monthly_limit: 0 });
    res.json({ token: signToken(userId), user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ detail: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ detail: 'Invalid email or password' });
    res.json({ token: signToken(user.id), user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(publicUser(req.user)));

module.exports = router;

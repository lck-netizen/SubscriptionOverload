/* User profile routes - update profile and email preferences */
const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/profile - Get current user profile
router.get('/', auth, async (req, res) => {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ detail: 'User not found' });
    
    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        country: user.country,
        isAdmin: user.isAdmin,
        emailPreferences: user.emailPreferences,
        created_at: user.created_at
    });
});

// PUT /api/profile - Update user profile
router.put('/', auth, async (req, res) => {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ detail: 'User not found' });
    
    const { firstName, lastName, phone, country, emailPreferences } = req.body;
    
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (country !== undefined) user.country = country;
    if (emailPreferences) {
        user.emailPreferences = {
            displayName: emailPreferences.displayName || user.emailPreferences.displayName,
            notificationEmail: emailPreferences.notificationEmail || user.emailPreferences.notificationEmail,
            customFooter: emailPreferences.customFooter || user.emailPreferences.customFooter
        };
    }
    
    await user.save();
    
    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        country: user.country,
        isAdmin: user.isAdmin,
        emailPreferences: user.emailPreferences,
        created_at: user.created_at
    });
});

module.exports = router;

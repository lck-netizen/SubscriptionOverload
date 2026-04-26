/* OTT Platform CRUD routes */
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const OTT = require('../models/OTT');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// GET /api/otts - List all active OTT platforms (public for logged-in users)
router.get('/', auth, async (req, res) => {
    const { category, status } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    
    // For regular users, only show active platforms
    if (!req.user.isAdmin) {
        filter.status = 'active';
    }
    
    const otts = await OTT.find(filter).sort({ popularity: -1, name: 1 });
    res.json(otts);
});

// GET /api/otts/all - List all OTT platforms including inactive (admin only)
router.get('/all', admin, async (req, res) => {
    const { category, status, search } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    
    const otts = await OTT.find(filter).sort({ category: 1, name: 1 });
    res.json(otts);
});

// GET /api/otts/:id - Get single OTT platform
router.get('/:id', auth, async (req, res) => {
    const ott = await OTT.findOne({ id: req.params.id });
    if (!ott) return res.status(404).json({ detail: 'OTT platform not found' });
    res.json(ott);
});

// POST /api/otts - Create new OTT platform (admin only)
router.post('/', admin, async (req, res) => {
    const { name, logo, description, category, pricingTiers, status, popularity } = req.body;
    
    const ott = await OTT.create({
        id: uuidv4(),
        name,
        logo: logo || '',
        description: description || '',
        category: category || 'Other',
        pricingTiers: pricingTiers || [],
        status: status || 'active',
        popularity: popularity || 0,
    });
    
    res.json(ott);
});

// PUT /api/otts/:id - Update OTT platform (admin only)
router.put('/:id', admin, async (req, res) => {
    const ott = await OTT.findOne({ id: req.params.id });
    if (!ott) return res.status(404).json({ detail: 'OTT platform not found' });
    
    Object.assign(ott, req.body);
    ott.updated_at = new Date();
    await ott.save();
    
    res.json(ott);
});

// DELETE /api/otts/:id - Delete OTT platform (admin only)
router.delete('/:id', admin, async (req, res) => {
    const result = await OTT.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
        return res.status(404).json({ detail: 'OTT platform not found' });
    }
    res.json({ status: 'deleted' });
});

module.exports = router;

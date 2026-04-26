/* Seed script to create admin user and sample OTT platforms */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('./models/User');
const OTT = require('./models/OTT');
const Budget = require('./models/Budget');

const ADMIN_EMAIL = 'chaturvedika1304@gmail.com';
const ADMIN_PASSWORD = 'pwd123456';

const sampleOTTs = [
    // Streaming
    {
        name: 'Netflix',
        logo: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200',
        description: 'Stream movies, TV shows, and original content',
        category: 'Streaming',
        pricingTiers: [
            { name: 'Mobile', price: 149, features: ['480p', '1 device', 'Mobile only'] },
            { name: 'Basic', price: 199, features: ['720p', '1 device', 'TV + Mobile'] },
            { name: 'Standard', price: 499, features: ['1080p', '2 devices', 'Full HD'] },
            { name: 'Premium', price: 649, features: ['4K', '4 devices', 'Ultra HD'] }
        ],
        status: 'active',
        popularity: 100
    },
    {
        name: 'Disney+ Hotstar',
        logo: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=200',
        description: 'Disney, Marvel, Star Wars, and live sports',
        category: 'Streaming',
        pricingTiers: [
            { name: 'Mobile', price: 149, features: ['HD', '1 device', 'Mobile only'] },
            { name: 'Super', price: 299, features: ['Full HD', '2 devices', 'Ad-free'] },
            { name: 'Premium', price: 1499, features: ['4K', '4 devices', 'All content'] }
        ],
        status: 'active',
        popularity: 95
    },
    {
        name: 'Amazon Prime Video',
        logo: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=200',
        description: 'Movies, series, and Prime delivery benefits',
        category: 'Streaming',
        pricingTiers: [
            { name: 'Monthly', price: 299, features: ['HD', 'Unlimited devices', 'Prime benefits'] },
            { name: 'Yearly', price: 1499, features: ['HD', 'Unlimited devices', 'Prime benefits', 'Best value'] }
        ],
        status: 'active',
        popularity: 90
    },
    {
        name: 'HBO Max',
        logo: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=200',
        description: 'Premium HBO content and originals',
        category: 'Streaming',
        pricingTiers: [
            { name: 'Standard', price: 699, features: ['HD', '2 devices', 'All HBO content'] }
        ],
        status: 'active',
        popularity: 75
    },

    // Music
    {
        name: 'Spotify',
        logo: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=200',
        description: 'Stream millions of songs and podcasts',
        category: 'Music',
        pricingTiers: [
            { name: 'Free', price: 0, features: ['Ads', 'Shuffle play'] },
            { name: 'Premium', price: 119, features: ['Ad-free', 'Offline', 'High quality'] },
            { name: 'Duo', price: 149, features: ['2 accounts', 'Ad-free', 'Offline'] },
            { name: 'Family', price: 179, features: ['6 accounts', 'Ad-free', 'Offline'] }
        ],
        status: 'active',
        popularity: 100
    },
    {
        name: 'Apple Music',
        logo: 'https://images.unsplash.com/photo-1611532736579-6b16e2b50449?w=200',
        description: 'Access to 90 million songs',
        category: 'Music',
        pricingTiers: [
            { name: 'Individual', price: 99, features: ['Lossless audio', 'Spatial audio', 'Offline'] },
            { name: 'Family', price: 149, features: ['6 accounts', 'All features'] }
        ],
        status: 'active',
        popularity: 85
    },
    {
        name: 'YouTube Music',
        logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=200',
        description: 'Music streaming with YouTube Premium',
        category: 'Music',
        pricingTiers: [
            { name: 'Premium', price: 129, features: ['Ad-free', 'Background play', 'Offline'] }
        ],
        status: 'active',
        popularity: 80
    },

    // Cloud Storage
    {
        name: 'Google Drive',
        logo: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=200',
        description: 'Cloud storage and file sync',
        category: 'Cloud Storage',
        pricingTiers: [
            { name: 'Basic (15GB)', price: 0, features: ['15GB', 'Free'] },
            { name: '100GB', price: 130, features: ['100GB', 'Premium support'] },
            { name: '200GB', price: 210, features: ['200GB', 'Premium support'] },
            { name: '2TB', price: 650, features: ['2TB', 'Family sharing', 'VPN'] }
        ],
        status: 'active',
        popularity: 95
    },
    {
        name: 'Dropbox',
        logo: 'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?w=200',
        description: 'Smart workspace for teams',
        category: 'Cloud Storage',
        pricingTiers: [
            { name: 'Plus (2TB)', price: 799, features: ['2TB', 'Smart sync', '30-day recovery'] },
            { name: 'Professional (3TB)', price: 1599, features: ['3TB', 'Advanced sharing', 'Watermarking'] }
        ],
        status: 'active',
        popularity: 70
    },
    {
        name: 'Microsoft OneDrive',
        logo: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=200',
        description: 'Cloud storage integrated with Office',
        category: 'Cloud Storage',
        pricingTiers: [
            { name: '100GB', price: 140, features: ['100GB', 'Office web apps'] },
            { name: '1TB', price: 419, features: ['1TB', 'Microsoft 365 apps'] }
        ],
        status: 'active',
        popularity: 75
    },

    // Productivity
    {
        name: 'Microsoft 365',
        logo: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=200',
        description: 'Office apps and cloud services',
        category: 'Productivity',
        pricingTiers: [
            { name: 'Personal', price: 419, features: ['1 user', 'Office apps', '1TB storage'] },
            { name: 'Family', price: 529, features: ['6 users', 'Office apps', '1TB each'] }
        ],
        status: 'active',
        popularity: 90
    },
    {
        name: 'Adobe Creative Cloud',
        logo: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=200',
        description: 'All Adobe creative apps',
        category: 'Productivity',
        pricingTiers: [
            { name: 'Photography', price: 799, features: ['Photoshop', 'Lightroom', '20GB storage'] },
            { name: 'Single App', price: 1699, features: ['One app', '100GB storage'] },
            { name: 'All Apps', price: 3999, features: ['20+ apps', '100GB storage', 'Portfolio'] }
        ],
        status: 'active',
        popularity: 85
    },
    {
        name: 'Notion',
        logo: 'https://images.unsplash.com/photo-1593642532400-2682810df593?w=200',
        description: 'All-in-one workspace',
        category: 'Productivity',
        pricingTiers: [
            { name: 'Free', price: 0, features: ['Unlimited pages', 'Basic features'] },
            { name: 'Plus', price: 799, features: ['Unlimited file uploads', 'Version history'] },
            { name: 'Business', price: 1199, features: ['Advanced permissions', 'SAML SSO'] }
        ],
        status: 'active',
        popularity: 80
    },

    // Gaming
    {
        name: 'Xbox Game Pass',
        logo: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=200',
        description: 'Unlimited access to 100+ games',
        category: 'Gaming',
        pricingTiers: [
            { name: 'Console', price: 489, features: ['Console games', 'Day-one releases'] },
            { name: 'PC', price: 489, features: ['PC games', 'EA Play'] },
            { name: 'Ultimate', price: 799, features: ['Console + PC', 'Cloud gaming', 'Xbox Live'] }
        ],
        status: 'active',
        popularity: 85
    },
    {
        name: 'PlayStation Plus',
        logo: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=200',
        description: 'Online multiplayer and free games',
        category: 'Gaming',
        pricingTiers: [
            { name: 'Essential', price: 499, features: ['Online multiplayer', '2 free games/month'] },
            { name: 'Extra', price: 749, features: ['400+ games', 'Game catalog'] },
            { name: 'Premium', price: 849, features: ['700+ games', 'Classic games', 'Game trials'] }
        ],
        status: 'active',
        popularity: 80
    },

    // News
    {
        name: 'The New York Times',
        logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200',
        description: 'Award-winning journalism',
        category: 'News',
        pricingTiers: [
            { name: 'Basic', price: 299, features: ['Unlimited articles', 'News app'] },
            { name: 'All Access', price: 599, features: ['All content', 'Cooking', 'Games', 'Wirecutter'] }
        ],
        status: 'active',
        popularity: 70
    },
    {
        name: 'The Economist',
        logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200',
        description: 'Global news and analysis',
        category: 'News',
        pricingTiers: [
            { name: 'Digital', price: 899, features: ['All articles', 'Audio edition', 'Archive'] }
        ],
        status: 'active',
        popularity: 65
    },

    // Education
    {
        name: 'Coursera Plus',
        logo: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=200',
        description: 'Unlimited access to 7000+ courses',
        category: 'Education',
        pricingTiers: [
            { name: 'Annual', price: 3999, features: ['7000+ courses', 'Certificates', 'Projects'] }
        ],
        status: 'active',
        popularity: 75
    },
    {
        name: 'Udemy Pro',
        logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
        description: 'Personal development subscription',
        category: 'Education',
        pricingTiers: [
            { name: 'Monthly', price: 1199, features: ['6000+ courses', 'Certificates', 'Practice tests'] }
        ],
        status: 'active',
        popularity: 70
    },

    // Fitness
    {
        name: 'Peloton',
        logo: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200',
        description: 'Live and on-demand fitness classes',
        category: 'Fitness',
        pricingTiers: [
            { name: 'App', price: 999, features: ['Unlimited classes', 'Multiple profiles'] },
            { name: 'All-Access', price: 3199, features: ['Equipment classes', 'Live leaderboard'] }
        ],
        status: 'active',
        popularity: 75
    },
    {
        name: 'Strava',
        logo: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200',
        description: 'Social network for athletes',
        category: 'Fitness',
        pricingTiers: [
            { name: 'Free', price: 0, features: ['Activity tracking', 'Social features'] },
            { name: 'Summit', price: 399, features: ['Advanced analytics', 'Route planning', 'Training plans'] }
        ],
        status: 'active',
        popularity: 70
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✓ Connected to MongoDB');

        // Create admin user
        const existingAdmin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
        let adminId;
        
        if (existingAdmin) {
            console.log('✓ Admin user already exists');
            adminId = existingAdmin.id;
            // Update to ensure admin flag is set
            existingAdmin.isAdmin = true;
            await existingAdmin.save();
        } else {
            const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
            adminId = uuidv4();
            await User.create({
                id: adminId,
                firstName: 'Chaturvedi',
                lastName: 'Ka',
                email: ADMIN_EMAIL.toLowerCase(),
                phone: '',
                country: '',
                password_hash: hash,
                isAdmin: true,
                emailPreferences: {
                    displayName: 'Chaturvedi Ka',
                    notificationEmail: ADMIN_EMAIL.toLowerCase(),
                    customFooter: ''
                }
            });
            
            // Create budget for admin
            await Budget.create({ user_id: adminId, monthly_limit: 0 });
            console.log('✓ Admin user created:', ADMIN_EMAIL);
        }

        // Seed OTT platforms
        const existingOTTs = await OTT.countDocuments();
        if (existingOTTs === 0) {
            for (const ottData of sampleOTTs) {
                await OTT.create({
                    id: uuidv4(),
                    ...ottData
                });
            }
            console.log(`✓ Seeded ${sampleOTTs.length} OTT platforms`);
        } else {
            console.log(`✓ ${existingOTTs} OTT platforms already exist`);
        }

        console.log('\n✅ Seed completed successfully!');
        console.log(`\nAdmin credentials:`);
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Password: ${ADMIN_PASSWORD}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
}

seed();

# Subscription Overload Manager — Node.js / Express backend

This directory contains a **Node.js + Express + MongoDB (Mongoose)** equivalent of the FastAPI backend in `/app/backend/`.

> The running application on this platform uses the FastAPI version (Python is required by the Emergent platform).
> This folder is provided for **academic submission, viva demonstration, and deployment on Render/Railway** where Node.js is required.

Everything is functionally identical (same routes, same data model, same rule-based logic, same Resend email integration).

## Quick start

```bash
cd /app/nodejs_backend
npm install
cp .env.example .env   # fill in MONGO_URL, JWT_SECRET, RESEND_API_KEY
npm run dev            # nodemon on port 5000
```

## API routes

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/subscriptions
POST   /api/subscriptions
PUT    /api/subscriptions/:id
DELETE /api/subscriptions/:id
POST   /api/subscriptions/:id/use

GET    /api/analytics/summary
GET    /api/analytics/forecast
GET    /api/recommendations

GET    /api/budget
POST   /api/budget

GET    /api/notifications
POST   /api/notifications/:id/read
POST   /api/notifications/read-all
```

## Folder layout

```
nodejs_backend/
├── server.js                     # Express entrypoint + cron scheduler
├── config/db.js                  # MongoDB connection
├── middleware/auth.js            # JWT verification middleware
├── models/                       # Mongoose schemas (User, Subscription, Notification, Budget)
├── routes/                       # Express route handlers
├── services/
│   ├── categorize.js             # Auto-categorization keyword map
│   ├── email.js                  # Resend HTML email helper
│   └── renewalJob.js             # Daily renewal-check cron task
└── package.json
```

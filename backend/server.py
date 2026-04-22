"""
============================================================================
 SUBSCRIPTION OVERLOAD MANAGER — FASTAPI BACKEND
============================================================================
 A full-stack app backend built with FastAPI + MongoDB (Motor async driver).
 Features:
   1. JWT authentication (register / login / /me)
   2. Subscription CRUD with auto-categorization
   3. Usage tracking ("mark as used today")
   4. Budget limit + alerts
   5. Expense analytics (total, category breakdown, monthly trend, forecast)
   6. Rule-based optimization recommendations
   7. In-app notifications + email renewal reminders via Resend
   8. Background scheduler (APScheduler) for daily renewal checks

 Note: Equivalent Node.js/Express codebase is in /app/nodejs_backend/
============================================================================
"""

# ---------------------------------------------------------------------------
# SECTION 1: IMPORTS & ENVIRONMENT SETUP
# ---------------------------------------------------------------------------
from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
import os
import uuid
import logging
import asyncio
import bcrypt
import jwt
import resend

# Load environment variables from /app/backend/.env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging config (prints time, level, module, message)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SECTION 2: DATABASE & EMAIL CLIENT SETUP
# ---------------------------------------------------------------------------
# MongoDB connection — uses MONGO_URL & DB_NAME from .env
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections used across the app
users_col = db.users                      # User accounts
subs_col = db.subscriptions               # Subscription records
usage_col = db.usage_logs                 # Usage frequency / last-used timestamps
notifs_col = db.notifications             # In-app notifications
budget_col = db.budgets                   # Per-user monthly budget limits

# Configure Resend (sync SDK, we will call in thread for async safety)
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'changeme')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_EXPIRE_MINUTES', '43200'))

# ---------------------------------------------------------------------------
# SECTION 3: FASTAPI APP + ROUTER
# ---------------------------------------------------------------------------
app = FastAPI(title="Subscription Overload Manager API")
api_router = APIRouter(prefix="/api")      # ALL routes must have /api prefix
security = HTTPBearer(auto_error=False)    # JWT bearer token extraction


# ---------------------------------------------------------------------------
# SECTION 4: PYDANTIC MODELS (Input / Output data contracts)
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    """Payload for POST /api/auth/register"""
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    """Payload for POST /api/auth/login"""
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    """User data returned to frontend (no password)"""
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class TokenResponse(BaseModel):
    """Response for /register and /login — JWT + user"""
    token: str
    user: UserPublic


class SubscriptionCreate(BaseModel):
    """Payload for POST /api/subscriptions"""
    service_name: str
    cost: float
    billing_cycle: str = Field(description="monthly | yearly | weekly")
    renewal_date: str   # ISO date string YYYY-MM-DD
    category: Optional[str] = None  # Auto-detected if not provided
    notes: Optional[str] = ""
    reminder_days: int = 3          # Notify N days before renewal


class SubscriptionUpdate(BaseModel):
    """Payload for PUT /api/subscriptions/{id} — all optional"""
    service_name: Optional[str] = None
    cost: Optional[float] = None
    billing_cycle: Optional[str] = None
    renewal_date: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None     # active | cancelled
    reminder_days: Optional[int] = None


class Subscription(BaseModel):
    """Full subscription record returned from API"""
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    service_name: str
    cost: float
    billing_cycle: str
    renewal_date: str
    category: str
    status: str
    notes: str
    reminder_days: int
    last_used: Optional[str] = None
    usage_count: int = 0
    created_at: datetime


class BudgetSet(BaseModel):
    """Payload for POST /api/budget"""
    monthly_limit: float


class Notification(BaseModel):
    """Notification returned to frontend"""
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    message: str
    type: str                 # reminder | suggestion | alert
    is_read: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# SECTION 5: AUTH HELPERS (password hashing, JWT encode/decode, current user)
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt (salted)."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Compare plaintext password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False


def create_jwt_token(user_id: str) -> str:
    """Create a signed JWT containing user_id + expiry."""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency that validates the Authorization: Bearer <token> header
    and returns the currently authenticated user document.
    Raises 401 if missing/invalid.
    """
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing auth token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await users_col.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# SECTION 6: AUTO-CATEGORIZATION (keyword-based mapping)
# ---------------------------------------------------------------------------
CATEGORY_KEYWORDS = {
    "OTT": ["netflix", "prime", "hotstar", "disney", "sony", "zee", "jio cinema", "hulu", "hbo", "apple tv"],
    "Music": ["spotify", "apple music", "youtube music", "gaana", "wynk", "tidal"],
    "Cloud": ["aws", "azure", "gcp", "google cloud", "digitalocean", "linode", "heroku", "vercel", "netlify"],
    "Productivity": ["notion", "slack", "trello", "asana", "monday", "clickup", "jira", "microsoft 365", "google workspace"],
    "SaaS": ["figma", "github", "gitlab", "canva", "adobe", "grammarly", "zoom", "calendly"],
    "Gaming": ["xbox", "playstation", "steam", "ea play", "nintendo"],
    "News": ["nyt", "new york times", "washington post", "bloomberg", "ft", "economist"],
    "Fitness": ["cult", "healthify", "strava", "fitbit"],
}


def auto_categorize(service_name: str) -> str:
    """Return a category based on the service name, or 'Other' if unknown."""
    name = service_name.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in name for kw in keywords):
            return category
    return "Other"


# ---------------------------------------------------------------------------
# SECTION 7: AUTH ENDPOINTS — /register, /login, /me
# ---------------------------------------------------------------------------
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(payload: UserRegister):
    """Create a new user account and return a JWT."""
    # Check if email already exists
    existing = await users_col.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Build user record
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await users_col.insert_one(user_doc)

    # Seed default budget (0 = unlimited)
    await budget_col.insert_one({"user_id": user_id, "monthly_limit": 0.0})

    token = create_jwt_token(user_id)
    return TokenResponse(
        token=token,
        user=UserPublic(
            id=user_id,
            name=payload.name,
            email=payload.email.lower(),
            created_at=datetime.fromisoformat(user_doc["created_at"]),
        ),
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    """Authenticate and return JWT + user."""
    user = await users_col.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt_token(user["id"])
    return TokenResponse(
        token=token,
        user=UserPublic(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            created_at=datetime.fromisoformat(user["created_at"]),
        ),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return UserPublic(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        created_at=datetime.fromisoformat(current_user["created_at"]),
    )


# ---------------------------------------------------------------------------
# SECTION 8: SUBSCRIPTION CRUD
# ---------------------------------------------------------------------------
@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(payload: SubscriptionCreate, current_user: dict = Depends(get_current_user)):
    """Create a new subscription for the current user."""
    sub_id = str(uuid.uuid4())
    category = payload.category or auto_categorize(payload.service_name)
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": sub_id,
        "user_id": current_user["id"],
        "service_name": payload.service_name,
        "cost": float(payload.cost),
        "billing_cycle": payload.billing_cycle,
        "renewal_date": payload.renewal_date,
        "category": category,
        "status": "active",
        "notes": payload.notes or "",
        "reminder_days": payload.reminder_days,
        "last_used": None,
        "usage_count": 0,
        "created_at": now_iso,
    }
    await subs_col.insert_one(doc)

    # After insert MongoDB mutates `doc` (adds _id); strip it before returning
    doc.pop("_id", None)
    return Subscription(**{**doc, "created_at": datetime.fromisoformat(now_iso)})


@api_router.get("/subscriptions", response_model=List[Subscription])
async def list_subscriptions(current_user: dict = Depends(get_current_user)):
    """Return all subscriptions belonging to the current user."""
    cursor = subs_col.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1)
    results = []
    async for doc in cursor:
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        results.append(Subscription(**doc))
    return results


@api_router.put("/subscriptions/{sub_id}", response_model=Subscription)
async def update_subscription(sub_id: str, payload: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    """Partially update a subscription (only provided fields)."""
    sub = await subs_col.find_one({"id": sub_id, "user_id": current_user["id"]}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await subs_col.update_one({"id": sub_id}, {"$set": updates})

    updated = await subs_col.find_one({"id": sub_id}, {"_id": 0})
    updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Subscription(**updated)


@api_router.delete("/subscriptions/{sub_id}")
async def delete_subscription(sub_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a subscription belonging to the current user."""
    result = await subs_col.delete_one({"id": sub_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"status": "deleted"}


@api_router.post("/subscriptions/{sub_id}/use")
async def mark_used(sub_id: str, current_user: dict = Depends(get_current_user)):
    """Record that the user used this service today (usage tracking)."""
    sub = await subs_col.find_one({"id": sub_id, "user_id": current_user["id"]}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    await subs_col.update_one(
        {"id": sub_id},
        {
            "$set": {"last_used": datetime.now(timezone.utc).isoformat()},
            "$inc": {"usage_count": 1},
        },
    )
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# SECTION 9: ANALYTICS + RECOMMENDATIONS + BUDGET
# ---------------------------------------------------------------------------
def _monthly_cost(sub: dict) -> float:
    """Normalize any billing cycle into a monthly equivalent in ₹."""
    cost = float(sub.get("cost", 0))
    cycle = sub.get("billing_cycle", "monthly")
    if cycle == "yearly":
        return cost / 12.0
    if cycle == "weekly":
        return cost * 4.33
    return cost  # monthly default


@api_router.get("/analytics/summary")
async def analytics_summary(current_user: dict = Depends(get_current_user)):
    """
    Returns the dashboard headline numbers:
       - active count, monthly total, yearly total
       - category breakdown
       - upcoming renewals (next 30 days)
       - budget utilization
    """
    subs = await subs_col.find(
        {"user_id": current_user["id"], "status": "active"}, {"_id": 0}
    ).to_list(1000)

    monthly_total = sum(_monthly_cost(s) for s in subs)
    yearly_total = monthly_total * 12

    # Category breakdown
    categories: dict = {}
    for s in subs:
        categories.setdefault(s["category"], 0.0)
        categories[s["category"]] += _monthly_cost(s)
    category_breakdown = [{"category": k, "amount": round(v, 2)} for k, v in categories.items()]

    # Upcoming renewals in next 30 days
    today = date.today()
    upcoming = []
    for s in subs:
        try:
            rdate = datetime.fromisoformat(s["renewal_date"]).date()
        except Exception:
            continue
        delta = (rdate - today).days
        if 0 <= delta <= 30:
            upcoming.append({
                "id": s["id"], "service_name": s["service_name"],
                "cost": s["cost"], "renewal_date": s["renewal_date"],
                "days_left": delta, "category": s["category"],
            })
    upcoming.sort(key=lambda x: x["days_left"])

    # Budget info
    budget = await budget_col.find_one({"user_id": current_user["id"]}, {"_id": 0})
    monthly_limit = float(budget.get("monthly_limit", 0)) if budget else 0

    return {
        "active_count": len(subs),
        "monthly_total": round(monthly_total, 2),
        "yearly_total": round(yearly_total, 2),
        "category_breakdown": category_breakdown,
        "upcoming_renewals": upcoming[:10],
        "monthly_limit": monthly_limit,
        "budget_used_pct": round((monthly_total / monthly_limit) * 100, 1) if monthly_limit > 0 else 0,
        "over_budget": monthly_limit > 0 and monthly_total > monthly_limit,
    }


@api_router.get("/analytics/forecast")
async def analytics_forecast(current_user: dict = Depends(get_current_user)):
    """Predict next 6 months of spend assuming the current active subscriptions continue."""
    subs = await subs_col.find(
        {"user_id": current_user["id"], "status": "active"}, {"_id": 0}
    ).to_list(1000)
    monthly = sum(_monthly_cost(s) for s in subs)

    # Generate 6 monthly datapoints (flat projection — simplest viable model)
    today = date.today()
    forecast = []
    for i in range(6):
        m = (today.month + i - 1) % 12 + 1
        y = today.year + ((today.month + i - 1) // 12)
        forecast.append({"month": f"{y}-{m:02d}", "projected": round(monthly, 2)})
    return {"forecast": forecast, "monthly_avg": round(monthly, 2)}


@api_router.get("/recommendations")
async def recommendations(current_user: dict = Depends(get_current_user)):
    """
    Rule-based optimization suggestions:
      - Unused >= 25 days (high-cost low-usage)
      - High-cost (> ₹500/month) regardless
      - Trial-ending (renewal in <= 3 days)
    """
    subs = await subs_col.find(
        {"user_id": current_user["id"], "status": "active"}, {"_id": 0}
    ).to_list(1000)

    now = datetime.now(timezone.utc)
    today = date.today()
    suggestions = []

    for s in subs:
        monthly_cost = _monthly_cost(s)

        # Rule 1: Not used for 25+ days
        if s.get("last_used"):
            last_used_dt = datetime.fromisoformat(s["last_used"])
            days_unused = (now - last_used_dt).days
            if days_unused >= 25:
                suggestions.append({
                    "type": "cancel",
                    "severity": "high",
                    "subscription_id": s["id"],
                    "service_name": s["service_name"],
                    "reason": f"Unused for {days_unused} days — consider cancelling to save ₹{round(monthly_cost,0)}/month.",
                    "saving": round(monthly_cost, 2),
                })
        elif s.get("usage_count", 0) == 0:
            # Never marked as used and added > 14 days ago
            created_dt = datetime.fromisoformat(s["created_at"])
            if (now - created_dt).days >= 14:
                suggestions.append({
                    "type": "cancel",
                    "severity": "medium",
                    "subscription_id": s["id"],
                    "service_name": s["service_name"],
                    "reason": f"No usage recorded in {(now-created_dt).days} days. Cancel to save ₹{round(monthly_cost,0)}/month.",
                    "saving": round(monthly_cost, 2),
                })

        # Rule 2: High-cost
        if monthly_cost > 500:
            suggestions.append({
                "type": "downgrade",
                "severity": "low",
                "subscription_id": s["id"],
                "service_name": s["service_name"],
                "reason": f"Premium spend detected (₹{round(monthly_cost,0)}/mo). Check for a cheaper tier.",
                "saving": round(monthly_cost * 0.3, 2),
            })

        # Rule 3: Upcoming renewal
        try:
            rdate = datetime.fromisoformat(s["renewal_date"]).date()
            if 0 <= (rdate - today).days <= 3:
                suggestions.append({
                    "type": "reminder",
                    "severity": "high",
                    "subscription_id": s["id"],
                    "service_name": s["service_name"],
                    "reason": f"Renews in {(rdate - today).days} days — review before being charged.",
                    "saving": 0,
                })
        except Exception:
            pass

    return {"suggestions": suggestions}


@api_router.get("/budget")
async def get_budget(current_user: dict = Depends(get_current_user)):
    """Return the user's monthly budget limit (0 = unset)."""
    b = await budget_col.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {"monthly_limit": float(b.get("monthly_limit", 0)) if b else 0.0}


@api_router.post("/budget")
async def set_budget(payload: BudgetSet, current_user: dict = Depends(get_current_user)):
    """Set/update the user's monthly budget."""
    await budget_col.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"monthly_limit": float(payload.monthly_limit)}},
        upsert=True,
    )
    return {"monthly_limit": payload.monthly_limit}


# ---------------------------------------------------------------------------
# SECTION 10: NOTIFICATIONS
# ---------------------------------------------------------------------------
@api_router.get("/notifications", response_model=List[Notification])
async def list_notifications(current_user: dict = Depends(get_current_user)):
    """Return the 50 newest in-app notifications."""
    cursor = notifs_col.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    out = []
    async for doc in cursor:
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        out.append(Notification(**doc))
    return out


@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a single notification as read."""
    await notifs_col.update_one(
        {"id": notif_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}},
    )
    return {"status": "ok"}


@api_router.post("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all of the user's notifications as read."""
    await notifs_col.update_many({"user_id": current_user["id"]}, {"$set": {"is_read": True}})
    return {"status": "ok"}


async def create_notification(user_id: str, message: str, ntype: str):
    """Helper: insert a notification document."""
    await notifs_col.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "message": message,
        "type": ntype,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# ---------------------------------------------------------------------------
# SECTION 11: BACKGROUND SCHEDULER — daily renewal reminder job
# ---------------------------------------------------------------------------
async def _send_renewal_email(email: str, name: str, sub: dict, days_left: int):
    """Send an HTML renewal-reminder email via Resend (non-blocking)."""
    if not os.environ.get('RESEND_API_KEY'):
        logger.info("No RESEND_API_KEY set — skipping email.")
        return
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0A0A0A">
      <h2 style="color:#002FA7;margin:0 0 16px 0">Renewal Reminder</h2>
      <p>Hi {name},</p>
      <p>Your <strong>{sub['service_name']}</strong> subscription will renew in
         <strong>{days_left} day{'s' if days_left != 1 else ''}</strong>
         for <strong>₹{sub['cost']}</strong>.</p>
      <p style="padding:12px 16px;background:#F9F9F9;border:1px solid #E5E7EB;border-radius:6px">
         Category: {sub['category']} | Billing: {sub['billing_cycle']}<br/>
         Renewal date: {sub['renewal_date']}
      </p>
      <p style="color:#52525B">If you no longer use this service, log in to cancel before the charge.</p>
      <p style="margin-top:24px;color:#A1A1AA;font-size:12px">— Subscription Overload Manager</p>
    </div>
    """
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": f"{sub['service_name']} renews in {days_left} day(s)",
            "html": html,
        })
        logger.info(f"Sent renewal email to {email} for {sub['service_name']}")
    except Exception as e:
        logger.error(f"Failed to send renewal email: {e}")


async def daily_renewal_check():
    """
    Runs daily (and once at startup).
    For each active subscription whose renewal_date falls within the user's
    reminder_days window:
      - Create in-app notification (once per cycle)
      - Send email via Resend
    """
    logger.info("Running daily_renewal_check ...")
    today = date.today()
    async for sub in subs_col.find({"status": "active"}, {"_id": 0}):
        try:
            rdate = datetime.fromisoformat(sub["renewal_date"]).date()
        except Exception:
            continue
        days_left = (rdate - today).days
        window = sub.get("reminder_days", 3)
        if 0 <= days_left <= window:
            # Avoid duplicate notification for the same renewal cycle
            existing = await notifs_col.find_one({
                "user_id": sub["user_id"],
                "type": "reminder",
                "message": {"$regex": sub["service_name"]},
                "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
            })
            if existing:
                continue

            msg = f"{sub['service_name']} renews in {days_left} day(s) — ₹{sub['cost']}"
            await create_notification(sub["user_id"], msg, "reminder")

            # Fetch user email and send
            user = await users_col.find_one({"id": sub["user_id"]}, {"_id": 0})
            if user:
                await _send_renewal_email(user["email"], user["name"], sub, days_left)


# ---------------------------------------------------------------------------
# SECTION 12: APP STARTUP / SHUTDOWN (register router, CORS, scheduler)
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Subscription Overload Manager API is running."}


# Register the /api router with the main FastAPI app
app.include_router(api_router)

# CORS — allow frontend (configured via REACT_APP_BACKEND_URL)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background scheduler — runs the renewal check daily at 09:00 UTC
scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def on_startup():
    # Schedule recurring job
    scheduler.add_job(daily_renewal_check, "cron", hour=9, minute=0, id="daily_renewal_check", replace_existing=True)
    scheduler.start()
    # Run once at startup (non-blocking) so fresh deploys pick up reminders immediately
    asyncio.create_task(daily_renewal_check())
    logger.info("Scheduler started; daily renewal check scheduled at 09:00 UTC.")


@app.on_event("shutdown")
async def on_shutdown():
    scheduler.shutdown(wait=False)
    client.close()

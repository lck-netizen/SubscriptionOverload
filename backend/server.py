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
    """User data returned to frontend (no password)."""
    id: str
    name: str
    email: EmailStr
    created_at: datetime
    phone: Optional[str] = ""
    avatar_url: Optional[str] = ""
    bio: Optional[str] = ""


class ProfileUpdate(BaseModel):
    """Payload for PUT /api/auth/profile — all optional."""
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


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
# SECTION 7: AUTH ENDPOINTS — /register, /login, /me, /profile
# ---------------------------------------------------------------------------
def _public_user(doc: dict) -> UserPublic:
    """Build the API-shape UserPublic from a raw Mongo user doc."""
    return UserPublic(
        id=doc["id"],
        name=doc["name"],
        email=doc["email"],
        created_at=datetime.fromisoformat(doc["created_at"]),
        phone=doc.get("phone", "") or "",
        avatar_url=doc.get("avatar_url", "") or "",
        bio=doc.get("bio", "") or "",
    )


@api_router.post("/auth/register", response_model=TokenResponse)
async def register(payload: UserRegister):
    """Create a new user account and return a JWT."""
    # Check if email already exists
    existing = await users_col.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Build user record with profile fields seeded as empty strings
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "phone": "",
        "avatar_url": "",
        "bio": "",
    }
    await users_col.insert_one(user_doc)

    # Seed default budget (0 = unlimited)
    await budget_col.insert_one({"user_id": user_id, "monthly_limit": 0.0})

    token = create_jwt_token(user_id)
    return TokenResponse(token=token, user=_public_user(user_doc))


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    """Authenticate and return JWT + user."""
    user = await users_col.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt_token(user["id"])
    return TokenResponse(token=token, user=_public_user(user))


@api_router.get("/auth/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return _public_user(current_user)


@api_router.put("/auth/profile", response_model=UserPublic)
async def update_profile(payload: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update the user's profile (name, phone, avatar_url, bio) AND send a
    confirmation email summarising the saved details. Returns the updated user.
    """
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await users_col.update_one({"id": current_user["id"]}, {"$set": updates})

    # Fetch the fresh record so we email the *final* state
    fresh = await users_col.find_one({"id": current_user["id"]}, {"_id": 0})

    # Fire-and-forget confirmation email (in a thread — Resend SDK is sync)
    asyncio.create_task(_send_profile_update_email(fresh))

    return _public_user(fresh)


async def _send_profile_update_email(user: dict):
    """HTML email summarising the user's profile details after an update."""
    if not os.environ.get("RESEND_API_KEY"):
        logger.info("Skipping profile email — RESEND_API_KEY not set.")
        return
    rows = [
        ("Name", user.get("name", "")),
        ("Email", user.get("email", "")),
        ("Phone", user.get("phone", "") or "—"),
        ("Bio", user.get("bio", "") or "—"),
        ("Avatar URL", user.get("avatar_url", "") or "—"),
    ]
    table_rows = "".join(
        f'<tr><td style="padding:8px 12px;color:#52525B;font-size:12px;text-transform:uppercase;letter-spacing:0.1em">{k}</td>'
        f'<td style="padding:8px 12px;color:#0A0A0A;font-weight:500">{v}</td></tr>'
        for k, v in rows
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0A0A0A">
      <h2 style="color:#10B981;margin:0 0 16px 0">Profile Updated</h2>
      <p>Hi {user.get('name','')},</p>
      <p>Your SubManager profile was just updated. Here's a copy of your latest details for your records:</p>
      <table style="width:100%;border:1px solid #E5E7EB;border-radius:8px;border-collapse:separate;border-spacing:0;margin:16px 0">
        {table_rows}
      </table>
      <p style="color:#52525B;font-size:13px">
        If you didn't make this change, please sign in and update your password.
      </p>
      <p style="margin-top:24px;color:#A1A1AA;font-size:12px">— Subscription Overload Manager</p>
    </div>
    """
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": [user["email"]],
            "subject": "Your SubManager profile has been updated",
            "html": html,
        })
        logger.info(f"Profile-update email sent to {user['email']}")
    except Exception as e:
        logger.error(f"Profile email failed: {e}")


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


# Known free / cheaper alternatives — surfaces a "switch" suggestion.
FREE_ALTERNATIVES = {
    "spotify":        ("YouTube Music (with YT Premium) or free Spotify tier", 0.5),
    "apple music":    ("YouTube Music or free Spotify tier", 0.5),
    "youtube music":  ("Free Spotify with ads", 1.0),
    "netflix":        ("Rotate with Prime Video / JioHotstar instead of keeping all", 1.0),
    "prime":          ("Keep Prime for shopping+OTT — a single bundle replacing multiple subs", 0.0),
    "adobe":          ("Consider Affinity / Canva Pro (one-time or cheaper)", 0.6),
    "grammarly":      ("LanguageTool Free or Grammarly free tier", 0.8),
    "canva":          ("Canva Free is enough for most casual design needs", 1.0),
    "chatgpt":        ("Free GPT / Gemini / Claude tiers are available", 1.0),
    "notion":         ("Notion Free is generous for personal use", 1.0),
}


@api_router.get("/recommendations")
async def recommendations(current_user: dict = Depends(get_current_user)):
    """
    Rule-based optimization engine. Generates a variety of saving-focused
    suggestions, de-duplicated per subscription per type:

        1. cancel    — unused >= 25 days / never used after 14 days
        2. downgrade — >₹500/month premium spend
        3. reminder  — renewal in <= 3 days
        4. yearly    — monthly billing → switch to yearly (≈20% save)
        5. consolidate — >1 active sub in same OTT/Music category
        6. free_alt  — known free / cheaper alternative exists
        7. bundle    — multiple OTT + Music → suggest a bundled plan
    """
    subs = await subs_col.find(
        {"user_id": current_user["id"], "status": "active"}, {"_id": 0}
    ).to_list(1000)

    now = datetime.now(timezone.utc)
    today = date.today()
    suggestions = []
    seen = set()  # (subscription_id, type) dedupe

    def add(s_id, stype, severity, name, reason, saving):
        key = (s_id, stype)
        if key in seen:
            return
        seen.add(key)
        suggestions.append({
            "type": stype, "severity": severity, "subscription_id": s_id,
            "service_name": name, "reason": reason, "saving": round(saving, 2),
        })

    # ---- per-subscription rules ----
    for s in subs:
        monthly_cost = _monthly_cost(s)

        # 1. Unused
        if s.get("last_used"):
            days_unused = (now - datetime.fromisoformat(s["last_used"])).days
            if days_unused >= 25:
                add(s["id"], "cancel", "high", s["service_name"],
                    f"Unused for {days_unused} days — cancel to save ₹{round(monthly_cost,0)}/month.",
                    monthly_cost)
        elif s.get("usage_count", 0) == 0:
            days_since_add = (now - datetime.fromisoformat(s["created_at"])).days
            if days_since_add >= 14:
                add(s["id"], "cancel", "medium", s["service_name"],
                    f"No usage recorded in {days_since_add} days. Cancel to save ₹{round(monthly_cost,0)}/month.",
                    monthly_cost)

        # 2. High-cost
        if monthly_cost > 500:
            add(s["id"], "downgrade", "low", s["service_name"],
                f"Premium spend detected (₹{round(monthly_cost,0)}/mo). Check for a cheaper tier.",
                monthly_cost * 0.3)

        # 3. Renewal soon
        try:
            rdate = datetime.fromisoformat(s["renewal_date"]).date()
            if 0 <= (rdate - today).days <= 3:
                add(s["id"], "reminder", "high", s["service_name"],
                    f"Renews in {(rdate - today).days} day(s) — review before being charged.",
                    0)
        except Exception:
            pass

        # 4. Monthly → yearly (roughly 20% savings on most services)
        if s.get("billing_cycle") == "monthly" and s.get("cost", 0) >= 200:
            yearly_save = s["cost"] * 12 * 0.2
            add(s["id"], "yearly", "low", s["service_name"],
                f"Most plans save ~20% annually. Switching to yearly could save ~₹{round(yearly_save,0)}/year.",
                yearly_save / 12)

        # 5. Free / cheaper alternative known
        name_lc = s["service_name"].lower()
        for keyword, (suggestion, save_ratio) in FREE_ALTERNATIVES.items():
            if keyword in name_lc and save_ratio > 0:
                add(s["id"], "free_alt", "medium", s["service_name"],
                    f"{suggestion}. Potential save ~₹{round(monthly_cost * save_ratio, 0)}/mo.",
                    monthly_cost * save_ratio)
                break

    # ---- cross-subscription rules (consolidation / bundle) ----
    by_cat: dict = {}
    for s in subs:
        by_cat.setdefault(s["category"], []).append(s)

    for category in ("OTT", "Music"):
        items = by_cat.get(category, [])
        if len(items) >= 2:
            total = sum(_monthly_cost(x) for x in items)
            cheapest = min(items, key=_monthly_cost)
            potential_save = total - _monthly_cost(cheapest)
            names = ", ".join(x["service_name"] for x in items)
            # Pin to the most expensive so user can action it
            pricey = max(items, key=_monthly_cost)
            add(pricey["id"], "consolidate", "medium", pricey["service_name"],
                f"You have {len(items)} {category} services ({names}). Rotate monthly instead — keep only one active at a time.",
                potential_save)

    # Bundle cue: if user has both OTT + Music, suggest a bundle like Prime / JioHotstar with music
    if by_cat.get("OTT") and by_cat.get("Music"):
        first_ott = by_cat["OTT"][0]
        add(first_ott["id"], "bundle", "low", first_ott["service_name"],
            "You pay separately for OTT + Music. Look at bundles (e.g., Jio/Airtel/Prime) that combine both for less.",
            sum(_monthly_cost(x) for x in by_cat["Music"]) * 0.5)

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
# ---------------------------------------------------------------------------
# SECTION 11a: INSTANT TEST EMAIL — useful for live demos / presentations
# ---------------------------------------------------------------------------
@api_router.post("/demo/send-test-email")
async def send_test_email(current_user: dict = Depends(get_current_user)):
    """
    Immediately send a sample renewal-reminder email to the logged-in user.
    Also creates a matching in-app notification so both channels are visible
    during a demo.
    NOTE: In Resend test mode, emails are only delivered to the address that
    verified the Resend account. Register your app account with that same
    email to actually receive the message in your inbox.
    """
    # Pick a subscription to reference (newest one, if any); otherwise fabricate one.
    sub = await subs_col.find_one({"user_id": current_user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    demo_sub = sub or {
        "service_name": "Netflix Premium",
        "cost": 649.0,
        "billing_cycle": "monthly",
        "renewal_date": (date.today() + timedelta(days=3)).isoformat(),
        "category": "OTT",
    }
    days_left = 3

    # 1. In-app notification
    await create_notification(
        current_user["id"],
        f"[TEST] {demo_sub['service_name']} renews in {days_left} day(s) — ₹{demo_sub['cost']}",
        "reminder",
    )

    # 2. Email (non-blocking) — errors surface but don't crash
    email_status = "skipped"
    email_error = None
    if os.environ.get("RESEND_API_KEY"):
        try:
            await _send_renewal_email(current_user["email"], current_user["name"], demo_sub, days_left)
            email_status = "sent"
        except Exception as e:
            email_status = "failed"
            email_error = str(e)
    else:
        email_error = "RESEND_API_KEY not configured"

    return {
        "email_status": email_status,
        "email_to": current_user["email"],
        "email_error": email_error,
        "notification_created": True,
        "service_used": demo_sub["service_name"],
    }


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

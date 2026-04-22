"""
End-to-end pytest suite for Subscription Overload Manager backend.
Covers: auth, subscription CRUD, usage tracking, analytics, recommendations,
budget, and notifications.
"""
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read from frontend/.env directly
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def fresh_user():
    """Register a fresh user and return (token, user, session)."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    email = f"TEST_{uuid.uuid4().hex[:8]}@example.com".lower()
    payload = {"name": "Pytest User", "email": email, "password": "pytest123"}
    r = session.post(f"{API}/auth/register", json=payload, timeout=20)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    token = data["token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    return {"token": token, "user": data["user"], "session": session, "email": email, "password": "pytest123"}


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_token_and_user(self, fresh_user):
        assert fresh_user["token"]
        assert fresh_user["user"]["email"] == fresh_user["email"]
        assert "id" in fresh_user["user"]

    def test_register_duplicate_email_rejected(self, fresh_user):
        r = requests.post(f"{API}/auth/register", json={
            "name": "Dup", "email": fresh_user["email"], "password": "pytest123"
        }, timeout=20)
        assert r.status_code == 400

    def test_login_success(self, fresh_user):
        r = requests.post(f"{API}/auth/login", json={
            "email": fresh_user["email"], "password": fresh_user["password"]
        }, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["token"]
        assert data["user"]["email"] == fresh_user["email"]

    def test_login_invalid_password(self, fresh_user):
        r = requests.post(f"{API}/auth/login", json={
            "email": fresh_user["email"], "password": "wrongpass"
        }, timeout=20)
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_me_with_token(self, fresh_user):
        r = fresh_user["session"].get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == fresh_user["email"]


# ---------- Subscriptions ----------
class TestSubscriptions:
    def test_create_netflix_autocategorizes_ott(self, fresh_user):
        renewal = (date.today() + timedelta(days=10)).isoformat()
        r = fresh_user["session"].post(f"{API}/subscriptions", json={
            "service_name": "Netflix Premium",
            "cost": 649,
            "billing_cycle": "monthly",
            "renewal_date": renewal,
        }, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["category"] == "OTT"
        assert body["cost"] == 649
        assert body["status"] == "active"
        fresh_user["netflix_id"] = body["id"]

    def test_create_aws_autocategorizes_cloud(self, fresh_user):
        r = fresh_user["session"].post(f"{API}/subscriptions", json={
            "service_name": "AWS EC2",
            "cost": 1200,
            "billing_cycle": "monthly",
            "renewal_date": (date.today() + timedelta(days=20)).isoformat(),
        }, timeout=20)
        assert r.status_code == 200
        assert r.json()["category"] == "Cloud"
        fresh_user["aws_id"] = r.json()["id"]

    def test_create_figma_autocategorizes_saas(self, fresh_user):
        r = fresh_user["session"].post(f"{API}/subscriptions", json={
            "service_name": "Figma Pro",
            "cost": 300,
            "billing_cycle": "monthly",
            "renewal_date": (date.today() + timedelta(days=2)).isoformat(),
        }, timeout=20)
        assert r.status_code == 200
        assert r.json()["category"] == "SaaS"
        fresh_user["figma_id"] = r.json()["id"]

    def test_list_subscriptions(self, fresh_user):
        r = fresh_user["session"].get(f"{API}/subscriptions", timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3
        names = {s["service_name"] for s in items}
        assert {"Netflix Premium", "AWS EC2", "Figma Pro"}.issubset(names)

    def test_update_subscription_persists(self, fresh_user):
        sub_id = fresh_user["netflix_id"]
        r = fresh_user["session"].put(f"{API}/subscriptions/{sub_id}", json={
            "cost": 799, "notes": "updated"
        }, timeout=20)
        assert r.status_code == 200
        assert r.json()["cost"] == 799
        # verify GET reflects update
        r2 = fresh_user["session"].get(f"{API}/subscriptions", timeout=20)
        netflix = [s for s in r2.json() if s["id"] == sub_id][0]
        assert netflix["cost"] == 799
        assert netflix["notes"] == "updated"

    def test_mark_used_increments_counter(self, fresh_user):
        sub_id = fresh_user["netflix_id"]
        r = fresh_user["session"].post(f"{API}/subscriptions/{sub_id}/use", timeout=20)
        assert r.status_code == 200
        items = fresh_user["session"].get(f"{API}/subscriptions", timeout=20).json()
        netflix = [s for s in items if s["id"] == sub_id][0]
        assert netflix["usage_count"] == 1
        assert netflix["last_used"] is not None

    def test_user_scoped_list(self, fresh_user):
        # Register another user and confirm isolation
        other_email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "Other", "email": other_email, "password": "pytest123"
        }, timeout=20)
        other_token = r.json()["token"]
        r2 = requests.get(f"{API}/subscriptions",
                          headers={"Authorization": f"Bearer {other_token}"}, timeout=20)
        assert r2.status_code == 200
        assert r2.json() == []


# ---------- Analytics ----------
class TestAnalytics:
    def test_summary_structure(self, fresh_user):
        r = fresh_user["session"].get(f"{API}/analytics/summary", timeout=20)
        assert r.status_code == 200
        data = r.json()
        for key in ["active_count", "monthly_total", "yearly_total",
                    "category_breakdown", "upcoming_renewals",
                    "monthly_limit", "budget_used_pct", "over_budget"]:
            assert key in data, f"Missing key {key}"
        assert data["active_count"] >= 3
        assert data["monthly_total"] > 0
        assert abs(data["yearly_total"] - data["monthly_total"] * 12) < 0.01
        assert len(data["upcoming_renewals"]) >= 1

    def test_forecast_six_months(self, fresh_user):
        r = fresh_user["session"].get(f"{API}/analytics/forecast", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "forecast" in data and "monthly_avg" in data
        assert len(data["forecast"]) == 6


# ---------- Recommendations ----------
class TestRecommendations:
    def test_recommendations_trigger_reminder_and_downgrade(self, fresh_user):
        r = fresh_user["session"].get(f"{API}/recommendations", timeout=20)
        assert r.status_code == 200
        suggestions = r.json()["suggestions"]
        types = {s["type"] for s in suggestions}
        # Figma renews in 2 days → reminder
        assert "reminder" in types, f"Expected 'reminder' in {types}"
        # AWS 1200 & Netflix 799 (>500) → downgrade
        assert "downgrade" in types, f"Expected 'downgrade' in {types}"


# ---------- Budget ----------
class TestBudget:
    def test_set_and_get_budget(self, fresh_user):
        r = fresh_user["session"].post(f"{API}/budget", json={"monthly_limit": 500}, timeout=20)
        assert r.status_code == 200
        assert r.json()["monthly_limit"] == 500
        r2 = fresh_user["session"].get(f"{API}/budget", timeout=20)
        assert r2.json()["monthly_limit"] == 500

    def test_over_budget_flag_in_summary(self, fresh_user):
        # Already set limit=500 but subs >>500 so over_budget should be True
        r = fresh_user["session"].get(f"{API}/analytics/summary", timeout=20)
        data = r.json()
        assert data["monthly_limit"] == 500
        assert data["over_budget"] is True
        assert data["budget_used_pct"] > 100


# ---------- Notifications ----------
class TestNotifications:
    def test_list_notifications(self, fresh_user):
        r = fresh_user["session"].get(f"{API}/notifications", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_read_all_notifications(self, fresh_user):
        r = fresh_user["session"].post(f"{API}/notifications/read-all", timeout=20)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ---------- Cleanup / delete at end ----------
class TestZDelete:
    def test_delete_subscription(self, fresh_user):
        sub_id = fresh_user["aws_id"]
        r = fresh_user["session"].delete(f"{API}/subscriptions/{sub_id}", timeout=20)
        assert r.status_code == 200
        # Subsequent delete should 404
        r2 = fresh_user["session"].delete(f"{API}/subscriptions/{sub_id}", timeout=20)
        assert r2.status_code == 404

"""
Plan Guard — checks Firebase Auth token + user plan.
Free users: 10 AI requests/day (tracked by IP).
Pro users:  unlimited.

If Firebase credentials are not configured, falls back to IP-only limits.
"""
import os
from collections import defaultdict
from fastapi import Request, HTTPException

# ── In-memory lifetime counter per IP ────────────────────────────────────────
# Format: { ip: count }
_ip_counters: dict = defaultdict(int)

FREE_TOTAL_LIMIT = 2  # lifetime free requests per IP

# ── Firebase Admin (optional — only if credentials are configured) ─────────────
_firebase_ready = False
_db = None

def _init_firebase():
    global _firebase_ready, _db
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore, auth

        if firebase_admin._apps:
            _firebase_ready = True
            _db = firestore.client()
            return

        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            import json
            cred = credentials.Certificate(json.loads(sa_json))
        else:
            # Try default credentials (works on Google Cloud)
            cred = credentials.ApplicationDefault()

        firebase_admin.initialize_app(cred, {"projectId": "finzilla-7f1f9"})
        _db = firestore.client()
        _firebase_ready = True
    except Exception as e:
        print(f"[plan_guard] Firebase not configured: {e}")
        _firebase_ready = False

_init_firebase()


def _get_plan_from_token(token: str) -> str:
    """Verify Firebase token and return user's plan ('free' or 'pro')."""
    if not _firebase_ready:
        return "free"
    try:
        from firebase_admin import auth, firestore
        decoded = auth.verify_id_token(token)
        uid = decoded["uid"]
        doc = _db.collection("users").document(uid).get()
        if doc.exists:
            return doc.to_dict().get("plan", "free")
        return "free"
    except Exception:
        return "free"


def _check_ip_quota(ip: str) -> bool:
    """Returns True if the IP is within lifetime free limit."""
    if _ip_counters[ip] >= FREE_TOTAL_LIMIT:
        return False
    _ip_counters[ip] += 1
    return True


def require_quota(req: Request):
    """
    Call this at the start of any AI endpoint.
    Raises HTTP 429 if the free quota is exceeded.
    Returns the user's plan string.
    """
    # Check for Firebase token
    auth_header = req.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        plan = _get_plan_from_token(token)
        if plan == "pro":
            return "pro"

    # Free user or no token — check IP quota
    ip = req.client.host if req.client else "unknown"
    if not _check_ip_quota(ip):
        raise HTTPException(
            status_code=429,
            detail={
                "error": "daily_limit_reached",
                "message": "You've used your 2 free trial questions. Upgrade to Pro for unlimited access.",
                "message_he": "השתמשת ב-2 השאלות החינמיות. שדרג ל-Pro לגישה ללא הגבלה.",
            }
        )
    return "free"

"""
Plan Guard — daily AI quota per plan tier.
Free:  3/day (IP-based, daily reset)
Pro:  20/day (UID-based, daily reset)
YOLO: 40/day (UID-based, daily reset)
"""
import os
import time
from collections import defaultdict
from fastapi import Request, HTTPException

DAILY_LIMITS = {"free": 3, "pro": 20, "yolo": 40}

# { key: {"date": "YYYY-MM-DD", "count": int} }
_counters: dict = defaultdict(lambda: {"date": "", "count": 0})

# ── Firebase Admin ────────────────────────────────────────────────────────────
_firebase_ready = False
_db = None

def _init_firebase():
    global _firebase_ready, _db
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        if firebase_admin._apps:
            _firebase_ready = True
            _db = firestore.client()
            return
        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            import json
            cred = credentials.Certificate(json.loads(sa_json))
        else:
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {"projectId": "finzilla-7f1f9"})
        _db = firestore.client()
        _firebase_ready = True
    except Exception as e:
        print(f"[plan_guard] Firebase not configured: {e}")

_init_firebase()


def _get_plan_from_token(token: str) -> tuple[str, str]:
    if not _firebase_ready:
        return "free", ""
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(token)
        uid = decoded["uid"]
        doc = _db.collection("users").document(uid).get()
        plan = doc.to_dict().get("plan", "free") if doc.exists else "free"
        return plan, uid
    except Exception:
        return "free", ""


def _check_quota(key: str, plan: str) -> bool:
    today = time.strftime("%Y-%m-%d")
    entry = _counters[key]
    if entry["date"] != today:
        entry["date"]  = today
        entry["count"] = 0
    limit = DAILY_LIMITS.get(plan, DAILY_LIMITS["free"])
    if entry["count"] >= limit:
        return False
    entry["count"] += 1
    return True


def require_quota(req: Request) -> str:
    auth_header = req.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        plan, uid = _get_plan_from_token(token)
        if plan in ("pro", "yolo") and uid:
            if not _check_quota(f"uid:{uid}", plan):
                limit = DAILY_LIMITS[plan]
                upgrade = " Upgrade to YOLO for 40/day." if plan == "pro" else ""
                raise HTTPException(status_code=429, detail={
                    "error": "daily_limit_reached",
                    "message": f"You've reached your {limit} daily AI questions.{upgrade} Resets at midnight.",
                    "message_he": f"הגעת למגבלת {limit} שאלות ביום.{' שדרג ל-YOLO ל-40 ביום.' if plan == 'pro' else ''} מתאפס בחצות.",
                })
            return plan

    # Free — IP-based daily limit
    ip = req.client.host if req.client else "unknown"
    if not _check_quota(f"ip:{ip}", "free"):
        raise HTTPException(status_code=429, detail={
            "error": "free_daily_limit_reached",
            "message": f"You've reached your {DAILY_LIMITS['free']} free daily questions. Upgrade to Pro ($4.90/mo) for 20/day.",
            "message_he": f"הגעת למגבלת {DAILY_LIMITS['free']} שאלות ביום בחינם. שדרג ל-Pro ($4.90/חודש) ל-20 ביום.",
        })
    return "free"

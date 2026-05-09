"""
WizeLife digest worker — weekly digest + tax-deadline reminders + inactivity nudges.

Schedule: invoke once per day. The worker checks today's date and decides which
flavor(s) to send to which users. Designed to be called from a Render Cron Job
or a GitHub Actions cron (whichever you prefer).

Env vars required:
  RESEND_API_KEY           — get from https://resend.com (free tier 100/day)
  FIREBASE_SERVICE_ACCOUNT_JSON — Firebase admin SDK credentials (JSON blob)
  DIGEST_FROM_EMAIL        — e.g. 'noreply@wizelife.ai' (verified) or 'onboarding@resend.dev'
  DIGEST_DRY_RUN           — '1' to log only, no actual sends (great for testing)

Run modes:
  python digest_worker.py weekly          → only Sunday digests
  python digest_worker.py deadlines       → today's tax-deadline reminders
  python digest_worker.py inactive        → inactivity nudges
  python digest_worker.py daily           → all of the above (auto-decides)
"""

import os
import sys
import json
import asyncio
import datetime
from typing import List, Dict, Optional

import httpx

# ── Firebase Admin (only if creds available) ──────────────────────────────────
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    _FB_OK = True
except Exception:
    _FB_OK = False

_db = None


def _get_db():
    global _db
    if _db is not None:
        return _db
    if not _FB_OK:
        print("[digest] firebase-admin not installed; cannot read users")
        return None
    sa = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not sa:
        print("[digest] FIREBASE_SERVICE_ACCOUNT_JSON not set")
        return None
    if not firebase_admin._apps:
        cred = credentials.Certificate(json.loads(sa))
        firebase_admin.initialize_app(cred)
    _db = firestore.client()
    return _db


# ── Resend ────────────────────────────────────────────────────────────────────
RESEND_URL = "https://api.resend.com/emails"


async def _send_email(to: str, subject: str, html: str, from_email: Optional[str] = None) -> bool:
    """Send a transactional email via Resend. Respects DIGEST_DRY_RUN."""
    if os.getenv("DIGEST_DRY_RUN") == "1":
        print(f"[digest] DRY_RUN → would send to {to}: {subject}")
        return True
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print("[digest] RESEND_API_KEY not set, skipping send")
        return False
    payload = {
        "from": from_email or os.getenv("DIGEST_FROM_EMAIL", "onboarding@resend.dev"),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            r = await client.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            if r.status_code in (200, 202):
                print(f"[digest] sent → {to}: {subject}")
                return True
            print(f"[digest] Resend {r.status_code}: {r.text[:200]}")
            return False
        except Exception as e:
            print(f"[digest] send error: {e}")
            return False


# ── HTML templates (simple, branded) ──────────────────────────────────────────
def _wrap(title: str, content_html: str, lang: str = "he") -> str:
    """Common email shell — WizeLife header + content + footer."""
    rtl = lang == "he"
    dir_attr = "rtl" if rtl else "ltr"
    return f"""<!DOCTYPE html>
<html lang="{lang}" dir="{dir_attr}">
<head>
<meta charset="UTF-8">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0c;font-family:'Plus Jakarta Sans',-apple-system,sans-serif;color:#f0f4ff;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://wizelife.ai" style="text-decoration:none;font-size:32px;font-weight:900;color:#eef2ff;">
        Wize<span style="background:linear-gradient(120deg,#6366f1,#8b5cf6,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Life</span>
      </a>
    </div>
    <div style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
      {content_html}
    </div>
    <div style="text-align:center;font-size:11px;color:#64748b;margin-top:22px;line-height:1.6;">
      WizeLife · 5 AI tools, one account · <a href="https://wizelife.ai" style="color:#a5b4fc;">wizelife.ai</a><br>
      <a href="https://wizelife.ai/dashboard.html?unsubscribe=1" style="color:#64748b;">Manage email preferences</a>
    </div>
  </div>
</body>
</html>"""


def render_weekly_digest(user: Dict, lang: str = "he") -> tuple[str, str]:
    """Return (subject, html) for a user's weekly digest."""
    name = user.get("nickname", "").split()[0] or "there"
    plan = user.get("plan", "free").upper()
    if lang == "he":
        subject = f"WizeLife Weekly — שלום {name}"
        body = f"""
        <h2 style="margin:0 0 14px;font-size:22px;color:#eef2ff;">שלום {name} 👋</h2>
        <p style="margin:0 0 18px;color:#8892a4;line-height:1.6;font-size:14px;">
            סיכום השבוע שלך ב-WizeLife. תוכנית פעילה: <strong style="color:#fbbf24;">{plan}</strong>
        </p>
        <ul style="padding-inline-start:20px;color:#cbd5e1;font-size:14px;line-height:1.8;">
            <li>בדוק את <a href="https://finsightai.github.io/finsight/pages/dashboard.html" style="color:#a5b4fc;">לוח המחוונים</a> שלך — האם השווי הנקי שלך עלה השבוע?</li>
            <li>השאלה השבועית ל<a href="https://finsightai.github.io/finsight/pages/investment-advisor.html" style="color:#a5b4fc;">יועץ ההשקעות</a>: איפה להפקיד את הכסף הפנוי?</li>
            <li>זמן לעדכן את <a href="https://vitara.onrender.com/data.html" style="color:#a5b4fc;">בדיקות הדם</a> אם לא הוספת השנה.</li>
        </ul>
        <a href="https://finsightai.github.io/wizelife/dashboard.html" style="display:inline-block;margin-top:18px;padding:12px 22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:99px;font-weight:700;">
            פתח את הדאשבורד →
        </a>
        """
    else:
        subject = f"WizeLife Weekly — Hello {name}"
        body = f"""
        <h2 style="margin:0 0 14px;font-size:22px;color:#eef2ff;">Hi {name} 👋</h2>
        <p style="margin:0 0 18px;color:#8892a4;line-height:1.6;font-size:14px;">
            Your weekly WizeLife summary. Active plan: <strong style="color:#fbbf24;">{plan}</strong>
        </p>
        <ul style="padding-inline-start:20px;color:#cbd5e1;font-size:14px;line-height:1.8;">
            <li>Check your <a href="https://finsightai.github.io/finsight/pages/dashboard.html" style="color:#a5b4fc;">dashboard</a> — did your net worth move this week?</li>
            <li>Weekly question for the <a href="https://finsightai.github.io/finsight/pages/investment-advisor.html" style="color:#a5b4fc;">advisor</a>: where to deploy your free cash?</li>
            <li>Time to update your <a href="https://vitara.onrender.com/data.html" style="color:#a5b4fc;">blood tests</a> if you haven't this year.</li>
        </ul>
        <a href="https://finsightai.github.io/wizelife/dashboard.html" style="display:inline-block;margin-top:18px;padding:12px 22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:99px;font-weight:700;">
            Open dashboard →
        </a>
        """
    return subject, _wrap(subject, body, lang)


def render_deadline_reminder(user: Dict, deadline: Dict, lang: str = "he") -> tuple[str, str]:
    name = user.get("nickname", "").split()[0] or "there"
    days = deadline["days_until"]
    label = deadline["label_he"] if lang == "he" else deadline["label_en"]
    if lang == "he":
        subject = f"⏰ תזכורת מס: {label} — בעוד {days} יום"
        body = f"""
        <h2 style="margin:0 0 14px;color:#fbbf24;">⏰ תזכורת חשובה</h2>
        <p style="font-size:15px;color:#eef2ff;">שלום {name},</p>
        <p style="font-size:14px;color:#cbd5e1;line-height:1.7;">
            דדליין מס מתקרב: <strong>{label}</strong><br>
            תאריך: <strong>{deadline['date']}</strong> (בעוד {days} יום).
        </p>
        <p style="font-size:13px;color:#94a3b8;">פתח את WizeTax כדי להכין את הניירת ולקבל ייעוץ מותאם אישית.</p>
        <a href="https://tax.wizelife.ai/advisor" style="display:inline-block;margin-top:14px;padding:12px 22px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;text-decoration:none;border-radius:99px;font-weight:700;">
            פתח את WizeTax →
        </a>
        """
    else:
        subject = f"⏰ Tax reminder: {label} — in {days} days"
        body = f"""
        <h2 style="margin:0 0 14px;color:#fbbf24;">⏰ Important reminder</h2>
        <p style="font-size:15px;color:#eef2ff;">Hi {name},</p>
        <p style="font-size:14px;color:#cbd5e1;line-height:1.7;">
            Tax deadline approaching: <strong>{label}</strong><br>
            Date: <strong>{deadline['date']}</strong> ({days} days from today).
        </p>
        <a href="https://tax.wizelife.ai/advisor" style="display:inline-block;margin-top:14px;padding:12px 22px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;text-decoration:none;border-radius:99px;font-weight:700;">
            Open WizeTax →
        </a>
        """
    return subject, _wrap(subject, body, lang)


# ── Tax deadline definitions ──────────────────────────────────────────────────
TAX_DEADLINES_2026 = [
    # (month, day, country_code, label_he, label_en)
    (5, 31, "IL", "דוח שנתי לעצמאי בישראל", "Israeli annual return (self-employed)"),
    (4, 30, "IL", "דוח חצי-שנתי 2025", "Israeli H1 return"),
    (4, 30, "BR", "Imposto de Renda Pessoa Física (IRPF)", "Brazilian individual tax return"),
    (4, 15, "US", "Form 1040 deadline", "US Form 1040 deadline"),
    (10, 15, "US", "Form 1040 extended deadline", "US Form 1040 extended"),
    (3, 15, "US", "Corporate / S-Corp deadline", "US S-Corp / Partnership"),
]

REMINDER_WINDOWS = [60, 30, 14, 7, 1]  # send N days before


def deadlines_to_remind_today(user_country: str = "IL", today: Optional[datetime.date] = None) -> List[Dict]:
    today = today or datetime.date.today()
    year = today.year
    out = []
    for m, d, country, lh, le in TAX_DEADLINES_2026:
        if country != user_country:
            continue
        deadline_date = datetime.date(year, m, d)
        diff = (deadline_date - today).days
        if diff in REMINDER_WINDOWS:
            out.append({"date": deadline_date.isoformat(), "days_until": diff,
                        "country": country, "label_he": lh, "label_en": le})
    return out


# ── Main entrypoints ──────────────────────────────────────────────────────────
async def run_weekly_digest():
    db = _get_db()
    if not db:
        return
    today = datetime.date.today()
    if today.weekday() != 6:  # Sunday only
        print("[digest] not Sunday, skipping weekly digest")
        return
    sent = 0
    for doc in db.collection("users").where("digestOptIn", "==", True).stream():
        u = doc.to_dict()
        if not u.get("email"):
            continue
        lang = (u.get("lang") or "he").split("-")[0]
        subject, html = render_weekly_digest(u, lang=lang if lang in ("he", "en") else "en")
        ok = await _send_email(u["email"], subject, html)
        if ok:
            sent += 1
        await asyncio.sleep(0.1)  # avoid rate limit
    print(f"[digest] weekly digest sent to {sent} users")


async def run_deadline_reminders():
    db = _get_db()
    if not db:
        return
    today = datetime.date.today()
    sent = 0
    for doc in db.collection("users").where("deadlineRemindersOptIn", "==", True).stream():
        u = doc.to_dict()
        if not u.get("email"):
            continue
        country = (u.get("country") or "IL").upper()
        deadlines = deadlines_to_remind_today(country, today)
        for dl in deadlines:
            lang = (u.get("lang") or "he").split("-")[0]
            subject, html = render_deadline_reminder(u, dl, lang=lang if lang in ("he", "en") else "en")
            ok = await _send_email(u["email"], subject, html)
            if ok:
                sent += 1
        await asyncio.sleep(0.1)
    print(f"[digest] deadline reminders sent: {sent}")


async def run_inactivity_nudge():
    db = _get_db()
    if not db:
        return
    today = datetime.datetime.utcnow()
    threshold = today - datetime.timedelta(days=30)
    sent = 0
    for doc in db.collection("users").where("lastSeenAt", "<", threshold).stream():
        u = doc.to_dict()
        if u.get("inactivityNudgeSent"):  # don't re-send
            continue
        if not u.get("email"):
            continue
        lang = (u.get("lang") or "he").split("-")[0]
        name = (u.get("nickname") or "").split()[0] or "there"
        if lang == "he":
            subject = f"מתגעגעים אליך, {name} 👋"
            body = f"""
            <h2 style="color:#eef2ff;">לא ראינו אותך כבר חודש</h2>
            <p style="color:#cbd5e1;line-height:1.7;font-size:14px;">
                שלום {name},<br>
                בזמן שהיית בחוץ, הוספנו: <strong>יועץ השקעות חכם, מעקב נתוני בריאות, watcher לחוקי מס</strong>.
            </p>
            <a href="https://finsightai.github.io/wizelife/dashboard.html" style="display:inline-block;margin-top:14px;padding:12px 22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:99px;font-weight:700;">
                חזור ל-WizeLife →
            </a>
            """
        else:
            subject = f"We miss you, {name} 👋"
            body = f"""
            <h2 style="color:#eef2ff;">It's been a month</h2>
            <p style="color:#cbd5e1;line-height:1.7;font-size:14px;">
                Hi {name},<br>
                Since you were away we shipped: <strong>smart investment advisor, health-data tracking, tax-law watcher</strong>.
            </p>
            <a href="https://finsightai.github.io/wizelife/dashboard.html" style="display:inline-block;margin-top:14px;padding:12px 22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:99px;font-weight:700;">
                Come back to WizeLife →
            </a>
            """
        ok = await _send_email(u["email"], subject, _wrap(subject, body, lang))
        if ok:
            sent += 1
            db.collection("users").document(doc.id).update({"inactivityNudgeSent": True})
        await asyncio.sleep(0.1)
    print(f"[digest] inactivity nudges sent: {sent}")


async def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "daily"
    if mode == "weekly":
        await run_weekly_digest()
    elif mode == "deadlines":
        await run_deadline_reminders()
    elif mode == "inactive":
        await run_inactivity_nudge()
    else:  # daily — auto-decide
        await run_weekly_digest()
        await run_deadline_reminders()
        await run_inactivity_nudge()


if __name__ == "__main__":
    asyncio.run(main())

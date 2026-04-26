import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv(override=False)  # Don't override existing env vars

from agent.orchestrator import run_agent
from models.user_profile import ChatRequest
from plan_guard import require_quota

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Tax Master AI", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", os.getenv("FRONTEND_URL", "")],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model": os.getenv("AI_PROVIDER", "gemini")}


@app.post("/api/chat")
@limiter.limit("20/minute")
async def chat(request: ChatRequest, req: Request):
    """Streaming chat endpoint - returns SSE stream."""
    require_quota(req)
    profile_dict = request.profile.model_dump() if request.profile else {}

    async def event_stream():
        async for event in run_agent(
            user_message=request.message,
            profile=profile_dict,
            conversation_history=request.conversation_history,
            provider=request.provider,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/api/countries")
async def get_countries():
    """Get list of supported countries."""
    from pathlib import Path
    import json

    data_path = Path(__file__).parent / "knowledge" / "static_data" / "tax_rates.json"
    with open(data_path) as f:
        data = json.load(f)

    countries = []
    for code, info in data["countries"].items():
        countries.append({
            "code": code,
            "name": info.get("name", code),
            "region": info.get("region", ""),
            "personal_income_tax_top": info.get("personal_income_tax_top", info.get("personal_income_tax", "varies")),
            "capital_gains_tax": info.get("capital_gains_tax", 0),
            "notable_for": info.get("notable_for", "")
        })

    return {"countries": countries}


@app.get("/api/regimes")
async def get_regimes():
    """Get list of special tax regimes."""
    from pathlib import Path

    data_path = Path(__file__).parent / "knowledge" / "static_data" / "special_regimes.json"
    with open(data_path) as f:
        data = json.load(f)

    regimes = []
    for regime_id, info in data["regimes"].items():
        regimes.append({
            "id": regime_id,
            "name": info.get("name", regime_id),
            "country": info.get("country", ""),
            "status": info.get("status", "active"),
            "best_for": info.get("best_for", [])
        })

    return {"regimes": regimes}


# ── Currency conversion (approximate, for bracket calculation) ─────────────────
USD_TO_LOCAL = {
    "UAE": 3.67, "CAYMAN": 0.82, "MONACO": 0.92, "SINGAPORE": 1.35,
    "HONG_KONG": 7.82, "MALTA": 0.92, "CYPRUS": 0.92, "PORTUGAL": 0.92,
    "IRELAND": 0.92, "UK": 0.79, "GERMANY": 0.92, "FRANCE": 0.92,
    "ITALY": 0.92, "NETHERLANDS": 0.92, "SWITZERLAND": 0.90, "ESTONIA": 0.92,
    "GREECE": 0.92, "USA": 1.0, "CANADA": 1.37, "AUSTRALIA": 1.55,
    "ISRAEL": 3.70, "GEORGIA": 2.70, "PARAGUAY": 7500.0, "THAILAND": 35.0,
    "PANAMA": 1.0, "MALAYSIA": 4.70,
}

# ── Employee Social Security / NI / Medicare (on employment+business income) ──
EMPLOYEE_SS = {
    "GERMANY":     {"rate": 0.198,  "cap_usd": 97000},   # pension+health+unempl+care
    "ITALY":       {"rate": 0.0919, "cap_usd": 120000},  # INPS pension
    "PORTUGAL":    {"rate": 0.11,   "cap_usd": None},    # TSU
    "SWITZERLAND": {"rate": 0.0575, "cap_usd": 100000},  # AHV/IV federal
    "ISRAEL":      {"rate": 0.105,  "cap_usd": 55000},   # Bituach Leumi + Kupat Holim
    "USA":         {"rate": 0.0765, "cap_usd": 168600},  # FICA (SS 6.2% capped + Medicare 1.45%)
    "CANADA":      {"rate": 0.0761, "cap_usd": 73200},   # CPP 5.95% + EI 1.66%
    "IRELAND":     {"rate": 0.04,   "cap_usd": None},    # PRSI employee
    "AUSTRALIA":   {"rate": 0.02,   "cap_usd": None},    # Medicare levy
}

# ── UK NI has a special two-band structure ────────────────────────────────────
UK_NI = {"rate": 0.08, "lower_usd": 15800, "upper_usd": 63000, "rate_above": 0.02}

# ── Countries where crypto held >1 year is 0% tax ────────────────────────────
CRYPTO_FREE_AFTER_1_YEAR = {"GERMANY"}


def bracket_tax(income_usd: float, brackets: list, usd_to_local: float) -> float:
    """Progressive bracket calculation with automatic currency conversion."""
    if not brackets or income_usd <= 0:
        return 0.0
    income_local = income_usd * usd_to_local
    tax_local = 0.0
    for b in brackets:
        b_min = float(b["min"])
        b_max = b.get("max")
        rate  = float(b["rate"])
        if income_local <= b_min:
            break
        upper = float(b_max) if b_max is not None else income_local
        taxable = min(income_local, upper) - b_min
        if taxable > 0:
            tax_local += taxable * rate
    return tax_local / usd_to_local


def estimate_tax(code: str, cdata: dict, income: dict, profile: dict) -> float:
    """Full tax estimate for one country using brackets, SS, special regimes, and crypto rules."""
    emp = float(income.get("employment", 0) or 0)
    biz = float(income.get("business",   0) or 0)
    cg  = float(income.get("capital_gains", 0) or 0)
    div = float(income.get("dividends",  0) or 0)
    cry = float(income.get("crypto",     0) or 0)
    ren = float(income.get("rental",     0) or 0)

    earned  = emp + biz + ren
    passive = cg + div + cry
    total   = earned + passive
    if total <= 0:
        return 0.0

    country_name    = cdata.get("name", "").upper()
    current_country = (profile.get("current_residency") or "").upper().replace(" ", "_")
    crypto_lt       = bool(profile.get("crypto_long_term", False))
    usd_to_local    = USD_TO_LOCAL.get(code, 1.0)
    citizenships    = [c.strip().upper().replace(" ", "_") for c in (profile.get("citizenships") or [])]

    # ── True zero-tax countries ────────────────────────────────────────────────
    if (float(cdata.get("personal_income_tax", 1) or 1) == 0
            and float(cdata.get("capital_gains_tax", 1) or 1) == 0
            and float(cdata.get("dividend_tax", 1) or 1) == 0):
        return 0.0

    # ── Italy / Greece EUR 100k flat tax on foreign passive income ─────────────
    if cdata.get("flat_tax_100k") and passive > 30000:
        if "ITAL" in country_name:
            return 100000 + (earned * 0.43 if earned > 0 else 0)
        if "GREC" in country_name:
            return 100000.0

    # ── Portugal IFICI: 20% flat on qualifying income for new residents ─────────
    if cdata.get("ifici_rate") and not current_country.startswith("PORT"):
        return float(cdata["ifici_rate"]) * (emp + biz)

    # ── Georgia HNWI: territorial on foreign income ────────────────────────────
    if cdata.get("territorial_for_hnwi") and total > 150000:
        return earned * 0.20

    # ── Non-dom / FIG / remittance-basis flags ────────────────────────────────
    cyprus_non_dom  = "CYPR" in country_name and bool(cdata.get("non_dom_regime"))
    malta_non_dom   = "MALT" in country_name and bool(cdata.get("non_dom_regime"))
    uk_fig          = code == "UK" and bool(cdata.get("fig_regime"))
    ireland_non_dom = code == "IRELAND" and bool(cdata.get("remittance_basis"))
    passive_exempt  = uk_fig or ireland_non_dom or (malta_non_dom and not earned)

    tax = 0.0

    # ── Earned income (employment + business + rental) ─────────────────────────
    if earned > 0:
        brackets = cdata.get("personal_income_tax_brackets")
        if brackets:
            it = bracket_tax(earned, brackets, usd_to_local)
        else:
            rate = cdata.get("personal_income_tax_top") or cdata.get("personal_income_tax") or 0
            if isinstance(rate, str): rate = 0.30
            it = earned * float(rate)

        # Germany solidarity surcharge (on high earners)
        if cdata.get("solidarity_surcharge") and earned > 70000:
            it += it * float(cdata["solidarity_surcharge"])

        # Italy regional + municipal (~3.2% average)
        if "ITAL" in country_name:
            it += earned * 0.032

        tax += it

        # Social Security / NI ─────────────────────────────────────────────────
        ss = EMPLOYEE_SS.get(code)
        if ss and (emp + biz) > 0:
            base = min(emp + biz, float(ss["cap_usd"])) if ss.get("cap_usd") else (emp + biz)
            tax += base * ss["rate"]

        if code == "UK" and (emp + biz) > 0:
            ni  = UK_NI
            g   = emp + biz
            if g > ni["lower_usd"]:
                band = min(g, ni["upper_usd"]) - ni["lower_usd"]
                tax += band * ni["rate"]
                if g > ni["upper_usd"]:
                    tax += (g - ni["upper_usd"]) * ni["rate_above"]

        # France: employee social charges on employment (~22%)
        if code == "FRANCE" and (emp + biz) > 0:
            tax += (emp + biz) * 0.22

        # Ireland USC (progressive, 0.5–8%)
        if code == "IRELAND" and (emp + biz) > 0:
            g   = emp + biz
            usc = 0.0
            if g > 0:      usc += min(g, 12012) * 0.005
            if g > 12012:  usc += (min(g, 25760) - 12012) * 0.02
            if g > 25760:  usc += (min(g, 70044) - 25760) * 0.04
            if g > 70044:  usc += (g - 70044) * 0.08
            tax += usc

    # ── Capital Gains ─────────────────────────────────────────────────────────
    if cg > 0:
        if passive_exempt or cyprus_non_dom or (cdata.get("territorial_system") and not earned):
            cg_rate = 0.0
        elif code == "FRANCE":
            cg_rate = 0.30  # PFU: 12.8% IR + 17.2% PS
        else:
            cg_rate = float(cdata.get("capital_gains_tax", 0) or 0)
            if isinstance(cdata.get("capital_gains_tax"), str): cg_rate = 0.20
        tax += cg * cg_rate

    # ── Crypto ────────────────────────────────────────────────────────────────
    if cry > 0:
        if (code in CRYPTO_FREE_AFTER_1_YEAR and crypto_lt) or passive_exempt or cyprus_non_dom \
                or (cdata.get("territorial_system") and not earned):
            crypto_rate = 0.0
        elif code == "FRANCE":
            crypto_rate = 0.30
        else:
            crypto_rate = float(cdata.get("capital_gains_tax", 0) or 0)
            if isinstance(cdata.get("capital_gains_tax"), str): crypto_rate = 0.20
        tax += cry * crypto_rate

    # ── Dividends ─────────────────────────────────────────────────────────────
    if div > 0:
        if passive_exempt or cyprus_non_dom or (cdata.get("territorial_system") and not earned):
            div_rate = 0.0
        else:
            div_rate = cdata.get("dividend_tax")
            if div_rate is None:
                div_rate = cdata.get("personal_income_tax_top", 0.25)
            if isinstance(div_rate, str): div_rate = 0.25
            div_rate = float(div_rate)
            # Apply treaty reduction if applicable
            for cit in citizenships:
                treaty_rate = treaty_dividend_rate(cit, code, div_rate)
                div_rate = min(div_rate, treaty_rate)
        tax += div * div_rate

    return tax


def treaty_dividend_rate(citizenship_country: str, dest_code: str, statutory_rate: float) -> float:
    """Return reduced dividend rate from tax treaty, or statutory_rate if no treaty."""
    from pathlib import Path as P
    try:
        tp = P(__file__).parent / "knowledge" / "static_data" / "tax_treaties.json"
        with open(tp) as f:
            treaties = json.load(f).get("key_treaties", {})
        for treaty in treaties.values():
            countries = [c.upper() for c in treaty.get("countries", [])]
            if citizenship_country.upper() in countries and dest_code.upper() in countries:
                dw = treaty.get("dividends_withholding")
                if isinstance(dw, dict):
                    return float(dw.get("treaty_rate", statutory_rate))
                if isinstance(dw, (int, float)):
                    return float(dw)
    except Exception:
        pass
    return statutory_rate


EXIT_TAXES = {
    "GERMANY": {"rate": 0.25, "note": "Wegzugsteuer: 25% on unrealized gains on corporate shares >1%", "applicable": "shares and business stakes"},
    "NETHERLANDS": {"rate": 0.249, "note": "Exit tax on substantial shareholdings >5%", "applicable": "corporate shares"},
    "ISRAEL": {"rate": 0.25, "note": "Section 100A: tax on unrealized capital gains since 2003", "applicable": "all capital assets"},
    "FRANCE": {"rate": 0.128, "note": "Exit tax on portfolios >EUR 800K or shares >25%", "applicable": "significant portfolios and corporate stakes"},
    "CANADA": {"rate": 0.27, "note": "Departure tax: deemed disposition at FMV", "applicable": "most capital assets"},
    "AUSTRALIA": {"rate": 0.30, "note": "CGT event I1: deemed disposal on departure", "applicable": "Australian property"},
    "SWEDEN": {"rate": 0.30, "note": "Exit tax on shares in closely held companies", "applicable": "closely held company shares"},
    "SPAIN": {"rate": 0.23, "note": "Exit tax on unrealized gains >EUR 4M or shares >25%", "applicable": "large portfolios"},
    "NORWAY": {"rate": 0.37, "note": "Exit tax on unrealized gains on shares", "applicable": "company shares"},
    "DENMARK": {"rate": 0.42, "note": "Exit tax on unrealized capital gains", "applicable": "various assets"},
}


@app.get("/api/country/{code}")
async def get_country_detail(code: str):
    """Return full tax data for a single country."""
    from pathlib import Path as P
    data_path = P(__file__).parent / "knowledge" / "static_data" / "tax_rates.json"
    with open(data_path) as f:
        tax_data = json.load(f)
    cdata = tax_data["countries"].get(code.upper())
    if not cdata:
        return {"error": "not_found"}
    exit_info = EXIT_TAXES.get(code.upper(), {})
    return {"code": code.upper(), "data": cdata, "exit_tax": exit_info}


ALLOWED_MEDIA_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
}

class AnalyzeReq(BaseModel):
    filename: str = ""
    content_base64: str
    media_type: str = "application/pdf"
    language: str = "he"


@app.post("/api/analyze")
@limiter.limit("10/minute")
async def analyze_document(request: AnalyzeReq, req: Request):
    """Analyze an uploaded document and return tax insights."""
    require_quota(req)

    # Validate media_type against allowlist
    if request.media_type not in ALLOWED_MEDIA_TYPES:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=400, detail="Unsupported file type.")

    import anthropic as _anthropic

    client = _anthropic.Anthropic()

    is_image = request.media_type.startswith("image/")
    if is_image:
        content_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": request.media_type, "data": request.content_base64},
        }
    else:
        content_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": request.media_type, "data": request.content_base64},
        }

    question = (
        "נתח את המסמך הזה מבחינת מיסים. זהה: 1) סוג ההכנסה והסכומים, 2) גובה המס המשולם, "
        "3) השלכות מס שצריך לדעת, 4) הזדמנויות לאופטימיזציה או חיסכון. "
        "ענה בעברית, בצורה ממוקדת ופרקטית."
        if request.language == "he" else
        "Analyze this document for tax purposes. Identify: 1) Income type and amounts, "
        "2) Tax paid or withheld, 3) Key tax implications, 4) Optimization opportunities. "
        "Be concise and practical."
    )

    try:
        resp = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2000,
            thinking={"type": "adaptive"},
            messages=[{"role": "user", "content": [content_block, {"type": "text", "text": question}]}],
        )
        text = "".join(b.text for b in resp.content if hasattr(b, "text"))
        return {"analysis": text}
    except Exception:
        return {"error": "שגיאה בניתוח המסמך. נסה שנית."}


class SavingsReq(BaseModel):
    profile: dict = {}


@app.post("/api/savings")
async def get_savings(request: SavingsReq):
    """Calculate estimated annual tax savings across countries for a user profile."""
    from pathlib import Path as P

    profile = request.profile
    income = profile.get("income", {})
    current_residency = (profile.get("current_residency") or "").strip().upper().replace(" ", "_")

    total_income = sum(
        income.get(k, 0) or 0
        for k in ("employment", "business", "capital_gains", "dividends", "crypto", "rental")
    )

    if total_income == 0:
        return {"error": "no_income", "message": "Add income to your profile first.", "results": []}

    data_path = P(__file__).parent / "knowledge" / "static_data" / "tax_rates.json"
    with open(data_path) as f:
        tax_data = json.load(f)
    countries = tax_data["countries"]

    # Current country
    current_code = None
    current_tax = 0.0
    for code, cdata in countries.items():
        if code == current_residency or cdata.get("name", "").upper().replace(" ", "_") == current_residency:
            current_code = code
            current_tax = estimate_tax(code, cdata, income, profile)
            break

    results = []
    for code, cdata in countries.items():
        if code == current_code:
            continue
        est = estimate_tax(code, cdata, income, profile)
        savings = current_tax - est
        results.append({
            "code": code,
            "name": cdata.get("name", code),
            "estimated_tax": round(est),
            "annual_savings": round(savings),
            "ten_year_savings": round(savings * 10),
            "effective_rate": round(est / total_income * 100, 1) if total_income else 0,
            "special_regimes": cdata.get("special_regimes", []),
            "territorial": cdata.get("territorial_system", False),
            "region": cdata.get("region", ""),
        })

    results.sort(key=lambda x: x["annual_savings"], reverse=True)

    # Exit tax estimate
    exit_info = EXIT_TAXES.get(current_code or "", {})
    exit_tax_estimate = 0
    if exit_info:
        assets = profile.get("assets", {})
        unrealized = ((assets.get("stocks", 0) or 0) + (assets.get("crypto_holdings", 0) or 0) + (assets.get("business_value", 0) or 0)) * 0.5
        exit_tax_estimate = round(unrealized * exit_info.get("rate", 0))

    return {
        "current_country": current_code or current_residency or "UNKNOWN",
        "current_country_name": countries.get(current_code or "", {}).get("name", current_residency),
        "current_tax": round(current_tax),
        "total_income": round(total_income),
        "current_effective_rate": round(current_tax / total_income * 100, 1) if total_income else 0,
        "exit_tax_info": exit_info,
        "exit_tax_estimate": exit_tax_estimate,
        "results": results[:20],
    }


# ── Israeli Tax & Pension Knowledge ───────────────────────────────────────────

ISRAEL_PENSION_RULES = {
    "keren_hishtalmut": {
        "name_he": "קרן השתלמות",
        "name_en": "Keren Hishtalmut (Study Fund)",
        "tax_free_years": 6,
        "non_resident_withholding": 0.25,
        "notes_he": "פטור ממס לאחר 6 שנות חיסכון. כשאר תושב חוץ — 25% ניכוי מס במקור על פדיון.",
        "notes_en": "Tax-free after 6 years. As non-resident — 25% withholding on withdrawal.",
        "strategy_he": "אם טרם עברו 6 שנים: שקול לחכות לפני ניתוק תושבות. אם עברו: פדה לפני ניתוק או קבל בניכוי 25%.",
        "strategy_en": "If <6 years: consider waiting before breaking residency. If 6+ years: withdraw before leaving (tax-free) or accept 25% withholding.",
    },
    "keren_pansiya": {
        "name_he": "קרן פנסיה",
        "name_en": "Pension Fund (Keren Pansiya)",
        "non_resident_withholding": 0.15,
        "notes_he": "תשלומים חודשיים ממשיכים גם לתושב חוץ. ניכוי מס במקור 15% (אמנה עשויה להפחית).",
        "notes_en": "Monthly payments continue to non-residents. 15% withholding (treaty may reduce).",
        "strategy_he": "ניתן להשאיר בישראל. בדוק האם מדינת היעד חתמה אמנה עם ישראל להפחתת ניכוי.",
        "strategy_en": "Can remain in Israel. Check if target country has treaty with Israel to reduce withholding.",
    },
    "kupat_gemel": {
        "name_he": "קופת גמל",
        "name_en": "Provident Fund (Kupat Gemel)",
        "withdrawal_age": 60,
        "early_withdrawal_penalty": 0.35,
        "non_resident_withholding": 0.25,
        "notes_he": "משיכה לפני גיל 60 — 35% מס. לאחר גיל 60 — תיענ כפנסיה חודשית (15%) או קצבה חד-פעמית (15%).",
        "notes_en": "Early withdrawal (under 60): 35% tax. After 60: monthly pension (15%) or lump sum (15%).",
        "strategy_he": "לרוב עדיף לא לפדות לפני גיל 60. שקול להשאיר בישראל ולקבל קצבה כתושב חוץ.",
        "strategy_en": "Usually best not to withdraw before 60. Consider leaving in Israel and receiving pension as non-resident.",
    },
    "bituach_menahalim": {
        "name_he": "ביטוח מנהלים",
        "name_en": "Executive Insurance (Bituach Menahalim)",
        "non_resident_withholding": 0.15,
        "notes_he": "דומה לקרן פנסיה — תשלומים חודשיים. 15% ניכוי מס במקור לתושב חוץ.",
        "notes_en": "Similar to pension fund — monthly payments. 15% withholding for non-residents.",
        "strategy_he": "ניתן להשאיר. בדוק אמנת מס לפחיתת הניכוי.",
        "strategy_en": "Can leave it. Check tax treaty for reduced withholding.",
    },
}

ISRAEL_RESIDENCY_RULES = {
    "primary_test_183": "גר בישראל 183 ימים ויותר בשנת המס",
    "secondary_test_425": "גר בישראל 30 ימים+ בשנה + 425 ימים+ ב-3 שנים רצופות",
    "center_of_life": "מרכז חיים נחשב — גם ללא עמידה בבחינת ימים (משפחה, נכסים, עסקים)",
    "center_of_life_factors": [
        "מקום מגורי המשפחה (בן/בת זוג, ילדים)",
        "מקום עיסוק קבוע / מקום עבודה",
        "מקום מגורים קבוע (בית, דירה)",
        "חברות בארגונים, מוסדות חברתיים",
        "מיקום הנכסים העיקריים",
        "מקום עיסוקים כלכליים ועסקים",
    ],
    "break_process": [
        "שהה מחוץ לישראל לפחות 183 ימים בשנה",
        "העבר מרכז חיים למדינה אחרת (משפחה, עסקים, נכסים)",
        "בצע הצהרת עזיבה לרשות המיסים בטופס 1348",
        "הגש דוח מס לשנת הפרישה עם הכנסות עד תאריך העזיבה",
        "הודע לביטוח לאומי על עזיבה (טופס ביטוח לאומי)",
        "הודע לקופת חולים",
    ],
    "grace_period": "ניתן לשמור תושבות ישראלית 4 שנים ראשונות (תקופת ניתוק) — בדיקת מרכז חיים בלבד",
}

ISRAEL_SECTION_100A = {
    "description_he": "סעיף 100א — 'מכירה רעיונית' בתאריך העזיבה על כל נכסי ההון",
    "description_en": "Section 100A — 'deemed sale' on departure date on all capital assets",
    "applies_to": ["מניות ישראליות ועולמיות", "נדל\"ן מחוץ לישראל", "קריפטו", "אג\"ח", "ניירות ערך"],
    "rate": 0.25,
    "base_date": "2003-01-01",
    "notes_he": "רק רווח שנצבר מ-1 בינואר 2003 חייב במס. ניתן לדחות תשלום עד למכירה בפועל.",
    "notes_en": "Only gains accrued since January 1, 2003 are taxable. Deferral possible until actual sale.",
    "deferral_options_he": [
        "אפשרות 1: שלם עכשיו (25% על הרווח הרעיוני ליום העזיבה)",
        "אפשרות 2: בחר דחייה — שלם בעת המכירה בפועל (יחסי: ימי תושבות / סה\"כ ימי החזקה)",
        "אפשרות 3: הסכם מוקדם עם רשות המיסים לפני העזיבה",
    ],
    "deferral_options_en": [
        "Option 1: Pay now (25% on unrealized gain at departure date)",
        "Option 2: Defer — pay on actual sale (proportional: Israeli residency days / total holding days)",
        "Option 3: Pre-departure agreement with Israeli Tax Authority",
    ],
}

ISRAEL_EXIT_PROCESS = [
    {"step": 1, "category": "מיסים", "title_he": "פנה לרשות המיסים — הצהרת עזיבה", "title_en": "File exit declaration with Israeli Tax Authority", "detail_he": "הגש טופס 1348 ו/או פנה לפקיד שומה. הצהר על תאריך ניתוק תושבות ועל כל הנכסים.", "detail_en": "Submit Form 1348 and/or contact the Tax Assessor. Declare departure date and all assets."},
    {"step": 2, "category": "מיסים", "title_he": "חישוב מס יציאה (סעיף 100א)", "title_en": "Calculate exit tax (Section 100A)", "detail_he": "הכן רשימת נכסי הון עם שווי ביום העזיבה וביום הרכישה. בחר בין תשלום מיידי לדחייה.", "detail_en": "Prepare capital asset list with values at departure and acquisition dates. Choose between immediate payment and deferral."},
    {"step": 3, "category": "פנסיה", "title_he": "קרן השתלמות — פדיון/השארה", "title_en": "Keren Hishtalmut — withdraw or leave", "detail_he": "אם עברו 6 שנות ותק: פדה לפני ניתוק תושבות (פטור ממס). אם לא — בחן האם לחכות.", "detail_en": "If 6+ years: withdraw before breaking residency (tax-free). If not — consider waiting."},
    {"step": 4, "category": "פנסיה", "title_he": "עדכן קרן פנסיה / קופת גמל / ביטוח מנהלים", "title_en": "Update pension fund / provident fund / executive insurance", "detail_he": "הודע לחברת הביטוח/קרן הפנסיה על שינוי כתובת ומעמד. ודא שניכוי מס במקור מוגדר נכון.", "detail_en": "Notify insurance company/pension fund of address change and status. Ensure correct withholding is applied."},
    {"step": 5, "category": "ביטוח לאומי", "title_he": "הגש טופס עזיבה לביטוח לאומי", "title_en": "Submit departure form to National Insurance Institute", "detail_he": "טופס 1510 — הודעת עזיבה לביטוח לאומי. מניעת חיובים עתידיים.", "detail_en": "Form 1510 — departure notice to National Insurance. Prevents future charges."},
    {"step": 6, "category": "בריאות", "title_he": "סיום חברות בקופת חולים", "title_en": "Terminate health fund (Kupat Holim) membership", "detail_he": "הגש בקשה לסיום חברות. שים לב: לא ניתן לחזור מיידית — יש תקופת המתנה בחזרה לישראל.", "detail_en": "Submit termination request. Note: cannot immediately rejoin — there is a waiting period on return."},
    {"step": 7, "category": "בנקאות", "title_he": "הסדר חשבונות בנק ישראלים", "title_en": "Arrange Israeli bank accounts", "detail_he": "הכרז על מעמד תושב חוץ בבנק. חשבון תושב חוץ (foreign resident account) — ריבית בניכוי מס שונה. שמור לצרכי תשלומי מס ישראלים.", "detail_en": "Declare non-resident status to bank. Open/convert to foreign resident account. Maintain for Israeli tax payments."},
    {"step": 8, "category": "עסקים", "title_he": "הסדר חברה ישראלית (אם קיימת)", "title_en": "Arrange Israeli company (if exists)", "detail_he": "CFC rules: כישראלי שעבר לחו\"ל — הכנסות חברה ישראלית עלולות לשמש אתך כ-CFC. שקול מכירה, עסקאות בעלי עניין, או ביצוע חלוקת דיבידנד לפני עזיבה.", "detail_en": "CFC rules: as Israeli moving abroad — Israeli company income may be attributed as CFC. Consider selling, related-party transactions, or dividend distribution before departure."},
    {"step": 9, "category": "נדל\"ן", "title_he": "הסדר נכסי נדל\"ן ישראלים", "title_en": "Arrange Israeli real estate", "detail_he": "שכירות מנכס בישראל — חייבת במס ישראל (10% מס מוחלט או לפי מדרגות). הכרז על הכנסה השוואתית.", "detail_en": "Rental income from Israeli property — taxed in Israel (10% flat or progressive brackets). Declare comparative income."},
    {"step": 10, "category": "מסמכים", "title_he": "קבל אישור תושבות מהמדינה החדשה", "title_en": "Obtain residency certificate from new country", "detail_he": "אישור רשמי שאתה תושב מס של המדינה החדשה — נדרש להגנה מפני תביעות מס ישראליות.", "detail_en": "Official certificate confirming you are tax resident of the new country — required to defend against Israeli tax claims."},
    {"step": 11, "category": "אמנות", "title_he": "בדוק אמנת מס עם מדינת היעד", "title_en": "Verify tax treaty with destination country", "detail_he": "ישראל חתמה אמנות עם 50+ מדינות. האמנה קובעת מניעת כפל מס ושיעורי ניכוי מופחתים.", "detail_en": "Israel has treaties with 50+ countries. The treaty determines double taxation prevention and reduced withholding rates."},
    {"step": 12, "category": "מסמכים", "title_he": "הגש דוח מס ישראלי לשנת הפרישה", "title_en": "File Israeli tax return for the year of departure", "detail_he": "דוח מס עד תאריך הניתוק. לאחר מכן — חובת הגשה רק על הכנסות ממקורות ישראלים.", "detail_en": "Tax return until departure date. After — filing obligation only for Israeli-source income."},
]

ISRAEL_COUNTRY_RANKING = [
    {
        "code": "CYPRUS", "name": "קפריסין", "name_en": "Cyprus",
        "score": 97,
        "treaty_with_israel": True,
        "flight_hours": 1.5,
        "israeli_community": "גדולה מאוד — ניקוסיה ולימסול",
        "israeli_community_en": "Very large — Nicosia and Limassol",
        "tax_benefit": "0% על דיבידנדים ורווחי הון לתושב non-dom. 0% קריפטו",
        "tax_benefit_en": "0% on dividends and capital gains for non-dom. 0% crypto",
        "residency_req": "60 ימים מינימום, לא לגור ב-183+ ימים במדינה אחרת",
        "residency_req_en": "60 days minimum, not residing 183+ days elsewhere",
        "min_investment": "לא נדרשת השקעה מינימלית לתושבות מס",
        "pros": ["קרוב לישראל", "קהילה ישראלית גדולה", "אמנת מס עם ישראל", "הכל ב-60 יום"],
        "cons": ["שפה לא אנגלית (יוונית)", "ביורוקרטיה"],
    },
    {
        "code": "UAE", "name": "איחוד האמירויות", "name_en": "UAE",
        "score": 92,
        "treaty_with_israel": True,
        "flight_hours": 3.5,
        "israeli_community": "גוברת — תל אביבים ויזמים",
        "israeli_community_en": "Growing — Tel Avivians and entrepreneurs",
        "tax_benefit": "0% על הכל. אין מס הכנסה, רווחי הון, דיבידנדים",
        "tax_benefit_en": "0% on everything. No income tax, capital gains, dividends",
        "residency_req": "ויזת זהב (2M AED) או ויזת חברה פעילה",
        "residency_req_en": "Golden Visa (2M AED investment) or active company visa",
        "min_investment": "~$550K לויזת זהב",
        "pros": ["אפס מס", "גישה לבנקים עולמיים", "אמנת מס עם ישראל (2022)", "קרוב לישראל"],
        "cons": ["עלות מחיה גבוהה", "נדרשת השקעה", "ביורוקרטיה"],
    },
    {
        "code": "PORTUGAL", "name": "פורטוגל", "name_en": "Portugal",
        "score": 78,
        "treaty_with_israel": True,
        "flight_hours": 5.5,
        "israeli_community": "בינונית — ליסבון",
        "israeli_community_en": "Medium — Lisbon",
        "tax_benefit": "IFICI: 20% על הכנסות מקצועיות לעשר שנים. הכנסות זרות פטורות (NHR ממשיך)",
        "tax_benefit_en": "IFICI: 20% flat on professional income for 10 years. Foreign income exempt (NHR successor)",
        "residency_req": "183 ימים או מגורים קבועים",
        "residency_req_en": "183 days or permanent home",
        "min_investment": "אין (visa d7 — הכנסה פסיבית) או השקעה לGolden Visa",
        "pros": ["מזג אוויר", "אירופה — דרכון EU", "שפה קלה", "NHR/IFICI"],
        "cons": ["רחוק מישראל", "IFICI על הכנסות זרות אפשרי מיסוי"],
    },
    {
        "code": "GEORGIA", "name": "גיאורגיה", "name_en": "Georgia",
        "score": 74,
        "treaty_with_israel": False,
        "flight_hours": 3.5,
        "israeli_community": "גוברת — טביליסי",
        "israeli_community_en": "Growing — Tbilisi",
        "tax_benefit": "VHB/HNWI: הכנסות זרות פטורות. מס הכנסה 20% על הכנסות מקומיות בלבד",
        "tax_benefit_en": "VHB/HNWI: foreign income exempt. 20% income tax on local income only",
        "residency_req": "מגורים 183 ימים",
        "residency_req_en": "183 days residence",
        "min_investment": "ללא אמנה עם ישראל — שים לב לניכוי מס ישראלי",
        "pros": ["עלות מחיה נמוכה", "ויזה קלה לישראלים", "קהל יזמים"],
        "cons": ["אין אמנת מס עם ישראל", "בנקאות מורכבת", "שפה"],
    },
    {
        "code": "MALTA", "name": "מלטה", "name_en": "Malta",
        "score": 72,
        "treaty_with_israel": True,
        "flight_hours": 3.5,
        "israeli_community": "קטנה",
        "israeli_community_en": "Small",
        "tax_benefit": "Non-dom: הכנסות זרות לא הועברות לחשבון מלטה — פטורות",
        "tax_benefit_en": "Non-dom: foreign income not remitted to Malta — exempt",
        "residency_req": "מגורים 183 ימים + תשלום מינימום €5,000 מס שנתי",
        "residency_req_en": "183 days + min €5,000 annual tax payment",
        "min_investment": "€5K מס שנתי מינימלי",
        "pros": ["EU", "אנגלית", "אמנה עם ישראל", "Mediterranean"],
        "cons": ["קטנה", "€5K מינימום מס", "הגבלות remittance"],
    },
    {
        "code": "GREECE", "name": "יוון", "name_en": "Greece",
        "score": 68,
        "treaty_with_israel": True,
        "flight_hours": 2.5,
        "israeli_community": "בינונית",
        "israeli_community_en": "Medium",
        "tax_benefit": "€100K flat tax שנתי על כל ההכנסות הזרות. ללא כפל מס.",
        "tax_benefit_en": "€100K annual flat tax on all foreign income. No further taxation.",
        "residency_req": "מגורים 183 ימים, לא גר בישראל 7 מתוך 8 שנים האחרונות",
        "residency_req_en": "183 days, not tax resident in Greece for 7 of 8 previous years",
        "min_investment": "€100K מס שנתי",
        "pros": ["קרוב לישראל", "EU", "מזג אוויר", "אמנה עם ישראל"],
        "cons": ["€100K מס שנתי — רק לעשירים מאוד"],
    },
    {
        "code": "PANAMA", "name": "פנמה", "name_en": "Panama",
        "score": 62,
        "treaty_with_israel": False,
        "flight_hours": 13,
        "israeli_community": "קטנה",
        "israeli_community_en": "Small",
        "tax_benefit": "מערכת טריטוריאלית — אין מס על הכנסות מחוץ לפנמה",
        "tax_benefit_en": "Territorial system — no tax on foreign-source income",
        "residency_req": "180 ימים+ או השקעה $300K",
        "residency_req_en": "180 days+ or $300K investment",
        "min_investment": "$300K להשקעה",
        "pros": ["אפס מס הכנסה זר", "עלות מחיה", "ויזה מחיר-כסף"],
        "cons": ["רחוק מישראל", "אין אמנה", "בנקאות"],
    },
    {
        "code": "THAILAND", "name": "תאילנד", "name_en": "Thailand",
        "score": 58,
        "treaty_with_israel": True,
        "flight_hours": 10,
        "israeli_community": "גדולה",
        "israeli_community_en": "Large",
        "tax_benefit": "הכנסות זרות שלא הועברו לתאילנד בשנת ייצורן — פטורות (LTR visa)",
        "tax_benefit_en": "Foreign income not remitted in year earned — exempt (LTR visa)",
        "residency_req": "LTR Visa — 10 שנים, הכנסה פסיבית $80K/year",
        "residency_req_en": "LTR Visa — 10 years, $80K passive income/year",
        "min_investment": "הכנסה פסיבית $80K/שנה",
        "pros": ["עלות מחיה נמוכה", "קהילה ישראלית", "אמנה עם ישראל", "פטור מס"],
        "cons": ["רחוק", "שפה", "בנקאות", "לא EU"],
    },
    {
        "code": "SPAIN", "name": "ספרד", "name_en": "Spain",
        "score": 85,
        "treaty_with_israel": True,
        "flight_hours": 5.0,
        "israeli_community": "גדולה מאוד — ברצלונה, מדריד",
        "israeli_community_en": "Very large — Barcelona, Madrid",
        "tax_benefit": "חוק בקהם: 24% flat tax על הכנסות עד €600K למשך 6 שנים. הכנסות זרות פטורות.",
        "tax_benefit_en": "Beckham Law: 24% flat on income up to €600K for 6 years. Foreign income exempt.",
        "residency_req": "183 ימים. לא גר בספרד 5 השנים האחרונות",
        "residency_req_en": "183 days. Not resident in Spain last 5 years",
        "min_investment": "אין — נדרש רק העברת מגורים",
        "pros": ["קהילה ישראלית ענקית", "EU + דרכון", "24% flat לשש שנים", "אמנה עם ישראל", "איכות חיים גבוהה"],
        "cons": ["אחרי 6 שנים — מס גבוה עד 47%", "מס עושר", "יוקר מחיה בברצלונה/מדריד"],
    },
    {
        "code": "BULGARIA", "name": "בולגריה", "name_en": "Bulgaria",
        "score": 88,
        "treaty_with_israel": True,
        "flight_hours": 2.5,
        "israeli_community": "בינונית-גדולה — סופיה",
        "israeli_community_en": "Medium-large — Sofia",
        "tax_benefit": "10% flat על הכל — מס ההכנסה הנמוך ביותר ב-EU. 5% דיבידנדים.",
        "tax_benefit_en": "10% flat on everything — lowest income tax in EU. 5% dividends.",
        "residency_req": "183 ימים",
        "residency_req_en": "183 days",
        "min_investment": "אין השקעה מינימלית נדרשת",
        "pros": ["EU + דרכון", "10% מס הכנסה", "5% דיבידנד", "עלות מחיה נמוכה מאוד", "אמנה עם ישראל"],
        "cons": ["שפה (בולגרית)", "תשתיות", "ביורוקרטיה EU"],
        "citizenship_bonus": "בעל דרכון רומני יכול לגור בבולגריה כאזרח EU ללא צורך בויזה נפרדת",
    },
    {
        "code": "ROMANIA", "name": "רומניה", "name_en": "Romania",
        "score": 80,
        "treaty_with_israel": True,
        "flight_hours": 3.0,
        "israeli_community": "קטנה — בוקרשט",
        "israeli_community_en": "Small — Bucharest",
        "tax_benefit": "10% flat tax, מיקרו-חברה 1-3%, ללא מס ירושה, ללא מס עושר",
        "tax_benefit_en": "10% flat tax, micro-company 1-3%, no inheritance tax, no wealth tax",
        "residency_req": "183 ימים",
        "residency_req_en": "183 days",
        "min_investment": "אין",
        "pros": ["EU + דרכון רומני", "10% מס", "מיקרו-חברה 1%", "אמנה עם ישראל", "דרכון ע\"פ מוצא זמין"],
        "cons": ["תשתיות", "ביורוקרטיה", "שפה"],
        "citizenship_note": "אזרחות רומנית זמינה ע\"פ מוצא — נכד/ילד של יוצא רומניה. מעניקה דרכון EU מלא. ניתן להחזיק בנוסף לאזרחות ישראלית.",
    },
    {
        "code": "HUNGARY", "name": "הונגריה", "name_en": "Hungary",
        "score": 75,
        "treaty_with_israel": True,
        "flight_hours": 3.0,
        "israeli_community": "בינונית — בודפשט",
        "israeli_community_en": "Medium — Budapest",
        "tax_benefit": "15% flat tax, 9% מס חברות (הנמוך ב-EU), ללא מס ירושה",
        "tax_benefit_en": "15% flat, 9% corporate (EU lowest), no inheritance tax",
        "residency_req": "183 ימים",
        "residency_req_en": "183 days",
        "min_investment": "אין",
        "pros": ["EU + דרכון", "15% flat", "9% חברות", "קהילה ישראלית היסטורית", "אמנה עם ישראל"],
        "cons": ["27% מע\"מ", "פוליטיקה", "שפה"],
    },
    {
        "code": "URUGUAY", "name": "אורוגוואי", "name_en": "Uruguay",
        "score": 73,
        "treaty_with_israel": False,
        "flight_hours": 14,
        "israeli_community": "גדולה מאוד — מונטווידאו",
        "israeli_community_en": "Very large — Montevideo",
        "tax_benefit": "0% על הכנסות זרות ל-10 שנים (territorial option). אחרי 10 שנים — 7% בלבד.",
        "tax_benefit_en": "0% on foreign income for 10 years (territorial option). After 10 years — only 7%.",
        "residency_req": "ללא מינימום ימים! נדרש מגורים בלבד",
        "residency_req_en": "No minimum days! Just establish residence",
        "min_investment": "$380K נדל\"ן או $1.7M השקעה, או אין — בקשה רגילה",
        "pros": ["0% מס זר 10 שנים", "קהילה ישראלית ענקית", "דרכון שלישי (5 שנים)", "דמוקרטיה יציבה", "קל לברזילאים (MERCOSUR)"],
        "cons": ["רחוק מישראל", "אין אמנה", "מטבע מקומי"],
        "citizenship_bonus": "אזרחי ברזיל מקבלים תושבות אורוגוואי בקלות דרך הסכם MERCOSUR. נתיב מהיר לדרכון שלישי.",
    },
    {
        "code": "MEXICO", "name": "מקסיקו", "name_en": "Mexico",
        "score": 70,
        "treaty_with_israel": True,
        "flight_hours": 13,
        "israeli_community": "גדולה — מקסיקו סיטי, תל אביב של מקסיקו (פולנקו)",
        "israeli_community_en": "Large — Mexico City, Polanco neighborhood",
        "tax_benefit": "הכנסות זרות — לא חייבות במס ברוב המקרים (territorial בפועל)",
        "tax_benefit_en": "Foreign income untaxed in most cases (territorial in practice)",
        "residency_req": "183 ימים, או תושבות זמנית 1-4 שנים",
        "residency_req_en": "183 days, or temporary residency 1-4 years",
        "min_investment": "אין",
        "pros": ["0% על הכנסות זרות", "קהילה ישראלית גדולה", "אמנה עם ישראל", "עלות מחיה נמוכה"],
        "cons": ["ביטחון", "ביורוקרטיה", "רחוק מישראל"],
    },
    {
        "code": "BAHRAIN", "name": "בחריין", "name_en": "Bahrain",
        "score": 86,
        "treaty_with_israel": False,
        "flight_hours": 2.5,
        "israeli_community": "גוברת — בעקבות הסכמי אברהם",
        "israeli_community_en": "Growing — following Abraham Accords",
        "tax_benefit": "0% מס הכנסה. 0% רווחי הון. 0% דיבידנד. 10% מע\"מ בלבד.",
        "tax_benefit_en": "0% income tax. 0% capital gains. 0% dividends. Only 10% VAT.",
        "residency_req": "ויזת תושבות זהב, ויזת משקיע, או חברה מקומית",
        "residency_req_en": "Golden Residency Visa, investor visa, or local company",
        "min_investment": "משתנה לפי סוג הויזה",
        "pros": ["אפס מס", "הסכמי אברהם (2020) — ישראלים מוזמנים", "טיסות ישירות מת\"א", "קרוב לישראל", "Gulf lifestyle"],
        "cons": ["לא חתם אמנת מס עם ישראל (עדיין)", "מדינה קטנה"],
        "israel_note": "בחריין חתמה על הסכמי אברהם 2020. יחסים עם ישראל מנורמלים. טיסות ישירות. ישראלים מוזמנים לגור ולהשקיע.",
    },
    {
        "code": "ANDORRA", "name": "אנדורה", "name_en": "Andorra",
        "score": 82,
        "treaty_with_israel": False,
        "flight_hours": 5.0,
        "israeli_community": "קטנה אך גוברת",
        "israeli_community_en": "Small but growing",
        "tax_benefit": "0-10% מס הכנסה (0% עד €24K). 0% רווחי הון. 0% דיבידנד. 0% ירושה.",
        "tax_benefit_en": "0-10% income tax (0% up to €24K). 0% CGT. 0% dividends. 0% inheritance.",
        "residency_req": "183 ימים בשנה. תושבות פסיבית: €400K נדל\"ן",
        "residency_req_en": "183 days/year. Passive residency: €400K real estate",
        "min_investment": "תושבות פסיבית: €400K נדל\"ן",
        "pros": ["10% מס מקסימלי", "0% רווחי הון + דיבידנד + ירושה", "3 שעות מברצלונה", "בנקאות מעולה", "פרטיות"],
        "cons": ["לא EU", "אין אמנה עם ישראל", "קטנה", "183 יום חובה"],
    },
    {
        "code": "AUSTRIA", "name": "אוסטריה", "name_en": "Austria",
        "score": 65,
        "treaty_with_israel": True,
        "flight_hours": 3.5,
        "israeli_community": "גדולה מאוד — וינה",
        "israeli_community_en": "Very large — Vienna",
        "tax_benefit": "27.5% KeSt flat על הכנסות הון. ללא מס ירושה. ללא מס עושר.",
        "tax_benefit_en": "27.5% KeSt flat on investment income. No inheritance tax. No wealth tax.",
        "residency_req": "183 ימים",
        "residency_req_en": "183 days",
        "min_investment": "אין",
        "pros": ["EU + דרכון", "קהילה ישראלית ענקית בוינה", "אמנה עם ישראל", "ללא מס ירושה/עושר", "איכות חיים גבוהה"],
        "cons": ["מס שולי 55%", "יוקר מחיה", "שפה גרמנית"],
    },
    {
        "code": "NEW_ZEALAND", "name": "ניו זילנד", "name_en": "New Zealand",
        "score": 68,
        "treaty_with_israel": False,
        "flight_hours": 24,
        "israeli_community": "קטנה",
        "israeli_community_en": "Small",
        "tax_benefit": "4 שנות Transitional Resident: פטור ממס על רוב ההכנסות הזרות. 0% CGT.",
        "tax_benefit_en": "4-year Transitional Resident: exempt from most foreign income tax. 0% CGT.",
        "residency_req": "לא גר בNZ 10 שנים האחרונות",
        "residency_req_en": "Not resident in NZ last 10 years",
        "min_investment": "אין",
        "pros": ["4 שנות פטור על הכנסות זרות", "0% CGT", "שלטון חוק חזק", "אנגלית", "איכות חיים"],
        "cons": ["רחוק מישראל", "אין אמנה עם ישראל", "אחרי 4 שנים — מס גבוה"],
    },
]


# ─── Company Optimizer ────────────────────────────────────────────────────────
COMPANY_JURISDICTIONS = [
    {
        "code": "CYPRUS", "flag": "🇨🇾", "name_he": "קפריסין", "name_en": "Cyprus",
        "corp_tax": 0.125, "dividend_nondom": 0.0, "dividend_standard": 0.17,
        "effective_nondom": 0.125, "effective_standard": 0.2735,
        "setup_cost_usd": 2500, "annual_cost_usd": 2000,
        "eu": True, "treaty_israel": True, "banking": "good",
        "e_residency": False, "substance_required": True,
        "notes_he": "12.5% מס חברות. Non-dom: 0% דיבידנד. מחייב substance אמיתי (מנהל מקומי + פגישות בקפריסין). חברת אחזקה EU מצוינת.",
        "notes_en": "12.5% corporate. Non-dom: 0% dividends. Requires genuine substance (local director + board meetings in Cyprus). Excellent EU holding.",
        "best_for_he": ["דיגיטל", "IP", "אחזקות", "ייעוץ"],
        "best_for_en": ["Digital", "IP holding", "Holdings", "Consulting"],
    },
    {
        "code": "ESTONIA", "flag": "🇪🇪", "name_he": "אסטוניה", "name_en": "Estonia",
        "corp_tax": 0.0, "corp_tax_distribution": 0.20,
        "dividend_nondom": 0.20, "dividend_standard": 0.20,
        "effective_nondom": 0.20, "effective_standard": 0.20,
        "setup_cost_usd": 500, "annual_cost_usd": 600,
        "eu": True, "treaty_israel": True, "banking": "good",
        "e_residency": True, "substance_required": False,
        "notes_he": "0% על רווחים שמורים — מס 20% רק בחלוקת דיבידנד. e-Residency: ניהול מרחוק 100%. אידיאלי לצבירת הון ורינוסטמנט.",
        "notes_en": "0% on retained earnings — 20% tax only on dividend distribution. e-Residency: 100% remote management. Ideal for capital accumulation.",
        "best_for_he": ["ריינוסטמנט", "סטארטאפ", "דיגיטל", "צבירת הון"],
        "best_for_en": ["Reinvestment", "Startup", "Digital", "Capital accumulation"],
    },
    {
        "code": "BULGARIA", "flag": "🇧🇬", "name_he": "בולגריה", "name_en": "Bulgaria",
        "corp_tax": 0.10, "dividend_nondom": 0.05, "dividend_standard": 0.05,
        "effective_nondom": 0.145, "effective_standard": 0.145,
        "setup_cost_usd": 800, "annual_cost_usd": 800,
        "eu": True, "treaty_israel": True, "banking": "good",
        "e_residency": False, "substance_required": False,
        "notes_he": "10% מס חברות + 5% דיבידנד = 14.5% effective. הכי נמוך ב-EU. פשוט לניהול. אידיאלי עם דרכון EU/רומני.",
        "notes_en": "10% corp + 5% dividend = 14.5% effective. Lowest in EU. Simple management. Ideal with EU/Romanian passport.",
        "best_for_he": ["כל עסק", "EU", "פשטות", "דרכון רומני"],
        "best_for_en": ["Any business", "EU base", "Simplicity", "Romanian passport"],
    },
    {
        "code": "UAE", "flag": "🇦🇪", "name_he": "UAE (Free Zone)", "name_en": "UAE (Free Zone)",
        "corp_tax": 0.0, "dividend_nondom": 0.0, "dividend_standard": 0.0,
        "effective_nondom": 0.0, "effective_standard": 0.0,
        "setup_cost_usd": 5000, "annual_cost_usd": 4000,
        "eu": False, "treaty_israel": True, "banking": "excellent",
        "e_residency": False, "substance_required": True,
        "notes_he": "0% בFree Zone. 9% Mainland (מעל AED 375K). בנקאות מצוינת. מחייב ויזת תושבות (~$550K השקעה). אמנה עם ישראל (2022).",
        "notes_en": "0% in Free Zone. 9% mainland (>AED 375K profit). Excellent banking. Requires residency visa. Israel treaty (2022).",
        "best_for_he": ["trading", "קריפטו", "שירותים", "0% מס"],
        "best_for_en": ["Trading", "Crypto", "Services", "Zero tax"],
    },
    {
        "code": "GEORGIA_VZ", "flag": "🇬🇪", "name_he": "גיאורגיה (Virtual Zone)", "name_en": "Georgia (Virtual Zone)",
        "corp_tax": 0.0, "dividend_nondom": 0.05, "dividend_standard": 0.05,
        "effective_nondom": 0.05, "effective_standard": 0.05,
        "setup_cost_usd": 300, "annual_cost_usd": 500,
        "eu": False, "treaty_israel": False, "banking": "moderate",
        "e_residency": False, "substance_required": False,
        "notes_he": "Virtual Zone: 0% על הכנסות זרות מIT/גיימינג/ייעוץ. 5% דיבידנד. עלות נמוכה מאוד. ⚠️ אין אמנת מס עם ישראל.",
        "notes_en": "Virtual Zone: 0% on foreign income from IT/gaming/consulting. 5% dividend. Very low cost. ⚠️ No Israel treaty.",
        "best_for_he": ["IT", "גיימינג", "ייעוץ", "עלות נמוכה"],
        "best_for_en": ["IT", "Gaming", "Consulting", "Low cost"],
    },
    {
        "code": "ROMANIA_MICRO", "flag": "🇷🇴", "name_he": "רומניה (מיקרו-חברה)", "name_en": "Romania (Micro-company)",
        "corp_tax": 0.01, "dividend_nondom": 0.08, "dividend_standard": 0.08,
        "effective_nondom": 0.0892, "effective_standard": 0.0892,
        "setup_cost_usd": 500, "annual_cost_usd": 600,
        "eu": True, "treaty_israel": True, "banking": "good",
        "e_residency": False, "substance_required": False,
        "notes_he": "מיקרו-חברה: 1% על מחזור (עד €500K, עובד אחד+). 8% דיבידנד. EU. אידיאלי עם דרכון רומני.",
        "notes_en": "Micro-company: 1% on turnover (up to €500K, 1+ employee). 8% dividend. EU. Ideal with Romanian passport.",
        "best_for_he": ["EU", "מחזור נמוך-בינוני", "דרכון רומני"],
        "best_for_en": ["EU", "Low-medium turnover", "Romanian passport"],
    },
    {
        "code": "HUNGARY", "flag": "🇭🇺", "name_he": "הונגריה", "name_en": "Hungary",
        "corp_tax": 0.09, "dividend_nondom": 0.15, "dividend_standard": 0.15,
        "effective_nondom": 0.2265, "effective_standard": 0.2265,
        "setup_cost_usd": 1000, "annual_cost_usd": 1000,
        "eu": True, "treaty_israel": True, "banking": "good",
        "e_residency": False, "substance_required": False,
        "notes_he": "9% מס חברות — הכי נמוך ב-EU. 15% דיבידנד. EU. פשוט להקמה. אידיאלי לחברות שמחלקות דיבידנד.",
        "notes_en": "9% corporate — EU lowest. 15% dividend. EU member. Simple to set up. Ideal for dividend-paying companies.",
        "best_for_he": ["EU", "holding", "כל עסק"],
        "best_for_en": ["EU", "Holding", "Any business"],
    },
    {
        "code": "SINGAPORE", "flag": "🇸🇬", "name_he": "סינגפור", "name_en": "Singapore",
        "corp_tax": 0.17, "dividend_nondom": 0.0, "dividend_standard": 0.0,
        "effective_nondom": 0.17, "effective_standard": 0.17,
        "setup_cost_usd": 2500, "annual_cost_usd": 2000,
        "eu": False, "treaty_israel": True, "banking": "excellent",
        "e_residency": False, "substance_required": True,
        "notes_he": "17% מס חברות. 0% דיבידנד (one-tier). טריטוריאלי. בנקאות מעולה. אמנה עם ישראל. מחייב מנהל מקומי.",
        "notes_en": "17% corporate. 0% dividend (one-tier). Territorial. Excellent banking. Israel treaty. Local director required.",
        "best_for_he": ["Asia-Pacific", "trading", "fintech"],
        "best_for_en": ["Asia-Pacific", "Trading", "Fintech"],
    },
    {
        "code": "PANAMA", "flag": "🇵🇦", "name_he": "פנמה", "name_en": "Panama",
        "corp_tax": 0.0, "dividend_nondom": 0.10, "dividend_standard": 0.10,
        "effective_nondom": 0.10, "effective_standard": 0.10,
        "setup_cost_usd": 1500, "annual_cost_usd": 1200,
        "eu": False, "treaty_israel": False, "banking": "moderate",
        "e_residency": False, "substance_required": False,
        "notes_he": "מערכת טריטוריאלית: 0% על הכנסות מחוץ לפנמה. 10% דיבידנד. ⚠️ אין אמנה עם ישראל.",
        "notes_en": "Territorial: 0% on foreign-source income. 10% dividend. ⚠️ No Israel treaty.",
        "best_for_he": ["טריטוריאלי", "trading"],
        "best_for_en": ["Territorial", "Trading"],
    },
]

COST_OF_LIVING_INDEX = {
    "ISRAEL": 100, "UAE": 95, "CYPRUS": 70, "PORTUGAL": 65, "SPAIN": 78,
    "GEORGIA": 38, "BULGARIA": 43, "ROMANIA": 40, "HUNGARY": 50, "GREECE": 65,
    "MALTA": 72, "THAILAND": 37, "MALAYSIA": 40, "PANAMA": 55, "URUGUAY": 62,
    "MEXICO": 48, "BRAZIL": 52, "ANDORRA": 82, "BAHRAIN": 88, "AUSTRIA": 102,
    "GERMANY": 108, "FRANCE": 100, "SWITZERLAND": 145, "UK": 108, "USA": 100,
    "CANADA": 98, "AUSTRALIA": 108, "SINGAPORE": 112, "HONG_KONG": 118,
    "MONACO": 195, "CAYMAN": 135, "IRELAND": 112, "NETHERLANDS": 108,
    "ITALY": 85, "ESTONIA": 55, "PARAGUAY": 38, "SERBIA": 40,
    "NEW_ZEALAND": 102, "JAPAN": 92, "COSTA_RICA": 55,
}

TAX_UPDATES_FEED = [
    {"date": "2026-03", "country": "ISRAEL", "type": "alert",
     "he": "ועדת רבינוביץ': הצעה להעלאת מס יציאה מ-25% ל-33% על נכסים מעל $3M. טרם אושר בכנסת.",
     "en": "Rabinovitch Committee: proposal to raise exit tax from 25% to 33% on assets over $3M. Not yet approved by Knesset."},
    {"date": "2025-12", "country": "UAE", "type": "positive",
     "he": "אמנת מס ישראל-UAE נכנסה לתוקף מלא. דיבידנדים: 0-5%. ריבית: 0%. רווחי הון: 0%.",
     "en": "Israel-UAE tax treaty fully in force. Dividends: 0-5%. Interest: 0%. Capital gains: 0%."},
    {"date": "2025-10", "country": "UK", "type": "change",
     "he": "Non-Dom בוטל. משטר FIG (4 שנות פטור) פעיל לכל עולים חדשים לבריטניה.",
     "en": "Non-Dom abolished. FIG regime (4-year foreign income exemption) active for all new UK arrivals."},
    {"date": "2025-09", "country": "PORTUGAL", "type": "change",
     "he": "IFICI (יורש NHR): 20% flat על הכנסות זכאיות ל-10 שנים. הכנסות זרות: חלקית פטורות.",
     "en": "IFICI (NHR successor): 20% flat on eligible income for 10 years. Foreign income: partially exempt."},
    {"date": "2025-07", "country": "SPAIN", "type": "alert",
     "he": "ספרד מציעה מס עושר פדרלי קבוע 0.5-3.5%. ממשלות אזוריות עלולות לאבד פטורים.",
     "en": "Spain proposes permanent federal wealth tax 0.5-3.5%. Regional exemptions may be canceled."},
    {"date": "2025-06", "country": "CYPRUS", "type": "positive",
     "he": "קפריסין הבהירה: קריפטו לnon-dom — 0% CGT, 0% הכנסה. ממשיך לחול.",
     "en": "Cyprus clarified: crypto for non-dom — 0% CGT, 0% income tax. Continues to apply."},
    {"date": "2025-04", "country": "GEORGIA", "type": "change",
     "he": "גיאורגיה מחמירה כללי VHB: נדרשת הכנסה פסיבית מינימלית $50K/שנה להוכחת קשר כלכלי.",
     "en": "Georgia tightening VHB rules: minimum $50K/year passive income required to prove economic ties."},
    {"date": "2025-03", "country": "THAILAND", "type": "change",
     "he": "תאילנד: הכנסות זרות שהועברו — חייבות במס גם משנים קודמות. LTV visa: 0.17% flat נשאר.",
     "en": "Thailand: foreign income remitted now taxable from prior years. LTV visa: 0.17% flat remains."},
    {"date": "2025-01", "country": "BAHRAIN", "type": "positive",
     "he": "בחריין פתחה נציגות מסחרית ישראלית. קהילה ישראלית עסקית גוברת. טיסות El Al ישירות.",
     "en": "Bahrain opened Israeli commercial representation. Growing Israeli business community. Direct El Al flights."},
    {"date": "2024-11", "country": "BULGARIA", "type": "positive",
     "he": "בולגריה: 10% flat + 5% דיבידנד נשארים ללא שינוי. אין עדכוני מס מתוכננים עד 2028.",
     "en": "Bulgaria: 10% flat + 5% dividend unchanged. No tax updates planned until 2028."},
    {"date": "2024-09", "country": "ROMANIA", "type": "change",
     "he": "רומניה: דיבידנד עלה מ-5% ל-8% (אוגוסט 2023). מיקרו-חברה 1% נשאר. EU passport יתרון.",
     "en": "Romania: dividend rose from 5% to 8% (August 2023). Micro-company 1% unchanged. EU passport advantage."},
]


class CompanyReq(BaseModel):
    annual_profit_usd: float = 100000
    owner_is_nondom: bool = True
    prefer_eu: bool = False


@app.post("/api/company")
async def company_optimizer(req: CompanyReq):
    """Compare company structures across jurisdictions."""
    profit = req.annual_profit_usd
    results = []
    for j in COMPANY_JURISDICTIONS:
        rate = j["effective_nondom"] if req.owner_is_nondom else j["effective_standard"]
        # Estonia: 0% until distribution — show deferred vs distributed
        if j["code"] == "ESTONIA":
            net_retained = profit  # tax deferred
            net_distributed = profit * (1 - j["dividend_nondom"])
            results.append({
                **j,
                "effective_rate": j["dividend_nondom"],
                "net_profit_usd": round(net_distributed),
                "net_retained_usd": round(net_retained),
                "tax_paid_usd": round(profit - net_distributed),
                "tax_if_retained": 0,
                "score": 100 - (j["dividend_nondom"] * 100) + (10 if req.prefer_eu and j["eu"] else 0),
            })
        else:
            net = profit * (1 - rate)
            results.append({
                **j,
                "effective_rate": rate,
                "net_profit_usd": round(net),
                "net_retained_usd": round(net),
                "tax_paid_usd": round(profit - net),
                "score": 100 - (rate * 100) + (10 if req.prefer_eu and j["eu"] else 0)
                         - (5 if j["substance_required"] else 0)
                         + (3 if j["treaty_israel"] else 0),
            })
    results.sort(key=lambda x: -x["score"])
    return {"results": results, "annual_profit": profit}


@app.get("/api/tax-updates")
async def tax_updates():
    return {"updates": TAX_UPDATES_FEED}


class IsraelReq(BaseModel):
    profile: dict = {}
    israel_profile: dict = {}


@app.post("/api/israel")
async def israel_analysis(request: IsraelReq):
    """Full Israeli exit planning analysis."""
    p = request.profile
    ip = request.israel_profile

    income = p.get("income", {})
    assets = p.get("assets", {})
    citizenships = p.get("citizenships", [])

    total_income = sum(income.get(k, 0) or 0 for k in ("employment", "business", "capital_gains", "dividends", "crypto", "rental"))
    total_assets = sum(assets.get(k, 0) or 0 for k in ("stocks", "real_estate", "crypto_holdings", "business_value"))

    # ── Keren Hishtalmut analysis ──────────────────────────────────────────────
    kh_value = float(ip.get("keren_hishtalmut_value", 0) or 0)
    kh_years = float(ip.get("keren_hishtalmut_years", 0) or 0)
    kh_analysis = {}
    if kh_value > 0:
        if kh_years >= 6:
            kh_analysis = {
                "status": "tax_free",
                "status_he": "✅ פטור ממס — ניתן לפדות לפני עזיבה",
                "status_en": "✅ Tax-free — withdraw before leaving",
                "withdrawal_net": kh_value,
                "advice_he": f"פדה את ה-₪{kh_value:,.0f} לפני ניתוק תושבות ישראלית — פטור ממס מלא.",
                "advice_en": f"Withdraw ₪{kh_value:,.0f} before breaking Israeli residency — fully tax-free.",
            }
        else:
            years_left = 6 - kh_years
            tax_if_leave = kh_value * 0.25
            kh_analysis = {
                "status": "wait_recommended",
                "status_he": f"⚠️ נותרו {years_left:.1f} שנים לפטור ממס",
                "status_en": f"⚠️ {years_left:.1f} years until tax-free",
                "tax_if_withdraw_now": tax_if_leave,
                "withdrawal_net_now": kh_value - tax_if_leave,
                "withdrawal_net_if_wait": kh_value,
                "advice_he": f"אם תפדה עכשיו כתושב חוץ — תשלם 25% = ₪{tax_if_leave:,.0f}. שקול לחכות {years_left:.1f} שנים.",
                "advice_en": f"If you withdraw now as non-resident — pay 25% = ₪{tax_if_leave:,.0f}. Consider waiting {years_left:.1f} years.",
            }
    else:
        kh_analysis = {"status": "no_data", "status_he": "לא הוזנו נתונים", "status_en": "No data entered"}

    # ── Pension fund analysis ──────────────────────────────────────────────────
    pension_value = float(ip.get("keren_pansiya_value", 0) or 0)
    gemel_value = float(ip.get("kupat_gemel_value", 0) or 0)
    bituach_value = float(ip.get("bituach_menahalim_value", 0) or 0)

    pension_analysis = []
    if pension_value > 0:
        annual_pension_est = pension_value * 0.04  # ~4% annual payout
        pension_analysis.append({
            "type": "keren_pansiya",
            "name_he": "קרן פנסיה",
            "value": pension_value,
            "strategy_he": f"המשך קבלת קצבה חודשית. ₪{pension_value:,.0f} → ~₪{annual_pension_est/12:,.0f}/חודש. ניכוי 15% במקור.",
            "strategy_en": f"Continue monthly pension. ₪{pension_value:,.0f} → ~₪{annual_pension_est/12:,.0f}/month. 15% withholding.",
        })
    if gemel_value > 0:
        gemel_analysis = "שמור עד גיל 60 — מס 35% על פדיון מוקדם" if gemel_value > 0 else ""
        pension_analysis.append({
            "type": "kupat_gemel",
            "name_he": "קופת גמל",
            "value": gemel_value,
            "strategy_he": f"₪{gemel_value:,.0f} — מס 35% על פדיון לפני 60. השאר עד גיל פרישה.",
            "strategy_en": f"₪{gemel_value:,.0f} — 35% tax on early withdrawal. Leave until retirement age.",
        })
    if bituach_value > 0:
        pension_analysis.append({
            "type": "bituach_menahalim",
            "name_he": "ביטוח מנהלים",
            "value": bituach_value,
            "strategy_he": f"₪{bituach_value:,.0f} — קצבה חודשית. 15% ניכוי מס במקור.",
            "strategy_en": f"₪{bituach_value:,.0f} — monthly pension. 15% withholding.",
        })

    # ── Exit tax (Section 100A) calculation ───────────────────────────────────
    stocks = float(assets.get("stocks", 0) or 0)
    crypto = float(assets.get("crypto_holdings", 0) or 0)
    biz_val = float(assets.get("business_value", 0) or 0)
    # Assume 50% gain on stocks/crypto, 80% on business
    unrealized_gain = stocks * 0.50 + crypto * 0.50 + biz_val * 0.80
    exit_tax_due = unrealized_gain * ISRAEL_SECTION_100A["rate"]

    exit_tax_analysis = {
        "unrealized_gain_estimate": round(unrealized_gain),
        "exit_tax_estimate": round(exit_tax_due),
        "rate": ISRAEL_SECTION_100A["rate"],
        "note_he": "הערכה — מניח 50% רווח על מניות/קריפטו, 80% על עסק. חשב עם רואה חשבון.",
        "note_en": "Estimate — assumes 50% gain on stocks/crypto, 80% on business. Calculate with CPA.",
        "deferral_options_he": ISRAEL_SECTION_100A["deferral_options_he"],
        "deferral_options_en": ISRAEL_SECTION_100A["deferral_options_en"],
    }

    # ── Residency status ───────────────────────────────────────────────────────
    days_in_israel = int(ip.get("days_in_israel_this_year", 0) or 0)
    years_as_resident = int(ip.get("years_as_israeli_resident", 0) or 0)
    has_company = bool(ip.get("has_israeli_company", False))
    family_in_israel = bool(ip.get("family_in_israel", False))

    residency_risks = []
    if days_in_israel >= 183:
        residency_risks.append({"severity": "high", "text_he": f"שהית {days_in_israel} ימים בישראל — עדיין תושב ישראלי!", "text_en": f"Stayed {days_in_israel} days in Israel — still considered Israeli resident!"})
    elif days_in_israel >= 30:
        residency_risks.append({"severity": "medium", "text_he": f"{days_in_israel} ימים — בדוק בחינת 425 יום. נותרים {183-days_in_israel} יום עד הסף.", "text_en": f"{days_in_israel} days — check 425-day test. {183-days_in_israel} days remaining to threshold."})
    if family_in_israel:
        residency_risks.append({"severity": "high", "text_he": "משפחה בישראל — גורם מרכז חיים מרכזי. נדרש ניתוק משפחתי או הסדר ברור.", "text_en": "Family in Israel — major center of life factor. Family relocation or clear arrangement required."})
    if has_company:
        residency_risks.append({"severity": "medium", "text_he": "חברה ישראלית פעילה — עלולה לשמש ראיה לקשר לישראל. בדוק CFC rules.", "text_en": "Active Israeli company — may constitute connection to Israel. Check CFC rules."})

    # ── Load tax data for per-country estimates ────────────────────────────────
    from pathlib import Path as P
    tax_rates_path = P(__file__).parent / "knowledge" / "static_data" / "tax_rates.json"
    tax_country_data: dict = {}
    try:
        with open(tax_rates_path) as f:
            tax_country_data = json.load(f)
    except Exception:
        pass

    # Current Israel tax (for savings baseline)
    israel_data = tax_country_data.get("ISRAEL", {})
    israel_annual_tax = estimate_tax("ISRAEL", israel_data, income, p) if israel_data else total_income * 0.35

    # ── Country recommendations ────────────────────────────────────────────────
    has_romanian_citizenship = any(c.lower() in ("romania", "romanian", "ro", "רומניה") for c in citizenships)
    has_brazilian_citizenship = any(c.lower() in ("brazil", "brazilian", "br", "ברזיל") for c in citizenships)
    has_eu_citizenship = has_romanian_citizenship or any(
        c.lower() in ("eu", "europe", "european", "malta", "cyprus", "portugal", "germany", "france", "greece", "spain", "austria", "hungary", "bulgaria", "ireland", "italy", "netherlands")
        for c in citizenships
    )

    EU_COUNTRIES = {"CYPRUS", "MALTA", "PORTUGAL", "IRELAND", "SPAIN", "AUSTRIA", "BULGARIA", "ROMANIA", "HUNGARY", "GREECE", "GERMANY", "FRANCE", "NETHERLANDS", "ITALY", "ESTONIA"}

    scored_countries = []
    for c in ISRAEL_COUNTRY_RANKING:
        score = c["score"]
        # Prefer EU for family/kids
        if family_in_israel and c["code"] in ("CYPRUS", "MALTA", "GREECE", "PORTUGAL", "SPAIN", "AUSTRIA", "HUNGARY", "BULGARIA", "ROMANIA"):
            score += 5
        # Boost treaty countries
        if c["treaty_with_israel"]:
            score += 3
        # Prefer close countries for frequent travelers
        if c["flight_hours"] <= 3:
            score += 5
        # Boost if Israeli community
        if "גדולה" in c.get("israeli_community", "") or "Very large" in c.get("israeli_community_en", ""):
            score += 4
        # Romanian citizenship bonus: EU countries become much more accessible
        if has_romanian_citizenship and c["code"] in EU_COUNTRIES:
            score += 10  # EU passport = free residency in any EU country
        # Brazilian citizenship bonus: South America countries easier
        if has_brazilian_citizenship and c["code"] in ("URUGUAY", "MEXICO", "COSTA_RICA", "PANAMA"):
            score += 8  # Mercosur + no-visa access
        # EU passport holder: non-EU countries matter less for freedom of movement
        if has_eu_citizenship and c["code"] in EU_COUNTRIES:
            score += 5

        # Estimate annual tax in this country
        cdata = tax_country_data.get(c["code"], {})
        annual_tax = estimate_tax(c["code"], cdata, income, p) if cdata else None
        annual_savings = (israel_annual_tax - annual_tax) if annual_tax is not None else None

        scored_countries.append({
            **c,
            "adjusted_score": score,
            "annual_tax_estimate": round(annual_tax) if annual_tax is not None else None,
            "annual_savings_vs_israel": round(annual_savings) if annual_savings is not None else None,
        })

    scored_countries.sort(key=lambda x: x["adjusted_score"], reverse=True)

    # ── Citizenship-specific notes ─────────────────────────────────────────────
    citizenship_notes = []
    if has_romanian_citizenship:
        citizenship_notes.append({
            "priority": "high",
            "text_he": "🇷🇴 יש לך (או יכול להיות לך) דרכון רומני = דרכון EU מלא. אתה יכול לגור ולעבוד בכל מדינת EU ללא ויזה נפרדת. הדירוג מעלה מדינות EU כמו בולגריה (10%), הונגריה (15%), קפריסין, ספרד.",
            "text_en": "🇷🇴 Romanian passport = full EU passport. You can live/work in any EU country without separate visa. Rankings boosted for EU countries like Bulgaria (10%), Hungary (15%), Cyprus, Spain.",
        })
    if has_brazilian_citizenship:
        citizenship_notes.append({
            "priority": "high",
            "text_he": "🇧🇷 דרכון ברזילאי: ברזיל אינה מטילה מס על פי אזרחות (בניגוד לארה\"ב). אזרח ברזילאי שאינו תושב ברזיל — אינו חייב במס ברזילאי על הכנסות זרות. אורוגוואי נגישה בקלות דרך MERCOSUR.",
            "text_en": "🇧🇷 Brazilian passport: Brazil does NOT tax by citizenship (unlike USA). Brazilian citizen who is not Brazilian tax resident pays zero Brazilian tax on foreign income. Uruguay easily accessible via MERCOSUR.",
        })

    # ── Optimal timing message ─────────────────────────────────────────────────
    timing_messages = citizenship_notes.copy()
    if kh_years < 6 and kh_value > 0:
        timing_messages.append({"priority": "high", "text_he": f"חכה {6-kh_years:.1f} שנים נוספות לפדיון קרן השתלמות פטור ממס (חיסכון: ₪{kh_value*0.25:,.0f}).", "text_en": f"Wait {6-kh_years:.1f} more years for tax-free Keren Hishtalmut (saves ₪{kh_value*0.25:,.0f})."})
    if days_in_israel >= 120:
        timing_messages.append({"priority": "high", "text_he": "סיים את שנת המס הנוכחית בישראל ותכנן עזיבה בינואר-פברואר הבא.", "text_en": "Complete current Israeli tax year then plan January-February departure."})
    if exit_tax_due > 100000:
        timing_messages.append({"priority": "medium", "text_he": f"מס יציאה משמעותי: ${exit_tax_due:,.0f}. שקול בחירת דחייה (סעיף 100א) לפי יחס ימי תושבות.", "text_en": f"Significant exit tax: ${exit_tax_due:,.0f}. Consider deferral election proportional to residency days."})

    # ── Bituach Leumi (National Insurance) analysis ───────────────────────────
    years_as_resident = int(ip.get("years_as_israeli_resident", 0) or 0)
    OLD_AGE_PENSION_MONTHLY_ILS = 5500  # approx 2026 basic pension
    # Qualification: 10+ years Israeli residency + age 67 (women 65)
    bl_years_for_pension = max(0, 10 - years_as_resident)
    bl_qualifies_old_age = years_as_resident >= 10
    bl_pension_monthly = OLD_AGE_PENSION_MONTHLY_ILS if bl_qualifies_old_age else 0
    # Partial pension: 1/40 for each qualifying year above minimum
    if bl_qualifies_old_age and years_as_resident < 40:
        bl_pension_monthly = round(OLD_AGE_PENSION_MONTHLY_ILS * (years_as_resident / 40))

    bituach_leumi_analysis = {
        "years_as_resident": years_as_resident,
        "old_age_pension": {
            "qualifies": bl_qualifies_old_age,
            "monthly_ils": bl_pension_monthly,
            "years_to_qualify": bl_years_for_pension,
            "note_he": (
                f"✅ זכאי לקצבת זקנה משוערת ₪{bl_pension_monthly:,.0f}/חודש (בגיל 67) — {years_as_resident} שנות תושבות."
                if bl_qualifies_old_age else
                f"⚠️ נדרשות עוד {bl_years_for_pension} שנות תושבות לזכאות קצבת זקנה (מינ' 10 שנים)."
            ),
            "note_en": (
                f"✅ Eligible for estimated ₪{bl_pension_monthly:,.0f}/month old-age pension (at age 67) — {years_as_resident} residency years."
                if bl_qualifies_old_age else
                f"⚠️ Need {bl_years_for_pension} more residency years to qualify for old-age pension (min 10 years)."
            ),
        },
        "healthcare": {
            "warning_he": "עזיבת ישראל מסיימת חברות בקופת חולים. בחזרה לישראל — תקופת המתנה של 6 חודשים (ניתן לקצר ע\"י תשלום).",
            "warning_en": "Leaving Israel terminates Kupat Holim membership. On return — 6-month waiting period (can be shortened by payment).",
            "action_he": "הגש בקשה לסיום חברות לפני עזיבה. שמור אישור לצרכי חזרה עתידית.",
            "action_en": "Submit termination request before departure. Keep confirmation for future return.",
        },
        "unemployment": {
            "note_he": "דמי אבטלה: זכות שנצברה — פוקעת עם עזיבת ישראל. אין זכאות לקצבת אבטלה לתושב חוץ.",
            "note_en": "Unemployment benefits: accrued right — lapses on departure. No unemployment eligibility for non-residents.",
        },
        "contributions_ongoing": {
            "note_he": "כתושב חוץ: אין חובת תשלום דמי ביטוח לאומי על הכנסות זרות. הכנסות ממקורות ישראלים — ייתכן ניכוי.",
            "note_en": "As non-resident: no National Insurance contributions on foreign income. Israeli-source income — possible withholding.",
        },
    }

    # Add cost of living index to each country recommendation
    for c in scored_countries:
        c["cost_of_living_index"] = COST_OF_LIVING_INDEX.get(c["code"], None)

    return {
        "kh_analysis": kh_analysis,
        "pension_analysis": pension_analysis,
        "exit_tax_analysis": exit_tax_analysis,
        "residency_risks": residency_risks,
        "country_recommendations": scored_countries[:8],
        "exit_process": ISRAEL_EXIT_PROCESS,
        "timing_messages": timing_messages,
        "pension_rules": ISRAEL_PENSION_RULES,
        "residency_rules": ISRAEL_RESIDENCY_RULES,
        "section_100a": ISRAEL_SECTION_100A,
        "israel_annual_tax": round(israel_annual_tax),
        "total_income_usd": round(total_income),
        "bituach_leumi": bituach_leumi_analysis,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

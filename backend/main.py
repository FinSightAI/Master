import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

load_dotenv(override=False)  # Don't override existing env vars

from agent.orchestrator import run_agent
from models.user_profile import ChatRequest

app = FastAPI(title="Tax Master AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model": "claude-opus-4-6"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Streaming chat endpoint - returns SSE stream."""
    profile_dict = request.profile.model_dump() if request.profile else {}

    async def event_stream():
        async for event in run_agent(
            user_message=request.message,
            profile=profile_dict,
            conversation_history=request.conversation_history
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


class AnalyzeReq(BaseModel):
    filename: str = ""
    content_base64: str
    media_type: str = "application/pdf"
    language: str = "he"


@app.post("/api/analyze")
async def analyze_document(request: AnalyzeReq):
    """Analyze an uploaded document and return tax insights."""
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
    except Exception as e:
        return {"error": str(e)}


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

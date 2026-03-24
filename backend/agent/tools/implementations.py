import json
import os
import httpx
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent / "knowledge" / "static_data"


def load_json(filename: str) -> dict:
    with open(DATA_DIR / filename, "r") as f:
        return json.load(f)


async def web_search(query: str, focus_country: str = None) -> str:
    """Search the web for current tax information."""
    full_query = query
    if focus_country:
        full_query = f"{focus_country} {query}"

    tavily_key = os.getenv("TAVILY_API_KEY")
    brave_key = os.getenv("BRAVE_API_KEY")

    if tavily_key and tavily_key != "your_tavily_api_key_here":
        return await _tavily_search(full_query, tavily_key)
    elif brave_key and brave_key != "your_brave_search_api_key_here":
        return await _brave_search(full_query, brave_key)
    else:
        return _mock_search(full_query)


async def _tavily_search(query: str, api_key: str) -> str:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "max_results": 5,
                    "include_answer": True
                },
                timeout=15.0
            )
            data = response.json()
            results = []
            if data.get("answer"):
                results.append(f"Summary: {data['answer']}\n")
            for r in data.get("results", [])[:5]:
                results.append(f"Source: {r.get('url', '')}\n{r.get('content', '')[:500]}\n")
            return "\n".join(results) if results else "No results found."
        except Exception as e:
            return f"Search error: {str(e)}. Note: Tax rates from knowledge base may be used instead."


async def _brave_search(query: str, api_key: str) -> str:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": 5},
                headers={"Accept": "application/json", "X-Subscription-Token": api_key},
                timeout=15.0
            )
            data = response.json()
            results = []
            for r in data.get("web", {}).get("results", [])[:5]:
                results.append(f"Title: {r.get('title')}\n{r.get('description', '')}\nURL: {r.get('url')}\n")
            return "\n".join(results) if results else "No results found."
        except Exception as e:
            return f"Search error: {str(e)}"


def _mock_search(query: str) -> str:
    return f"""Web search for: "{query}"

No search API configured. To enable live web search:
1. Get a free Tavily API key at tavily.com
2. Add TAVILY_API_KEY to your .env file

Using knowledge base data instead. Note: Tax laws change frequently - verify current rates with official sources.

Recommended official sources:
- OECD Tax Database: stats.oecd.org/index.aspx?DataSetCode=TABLE_I1
- PWC Worldwide Tax Summaries: taxsummaries.pwc.com
- Deloitte Tax Guides: www.deloitte.com/global/en/services/tax.html
- KPMG Tax Rates Online: kpmg.com/xx/en/home/services/tax/tax-tools-and-resources/tax-rates-online.html"""


def get_country_tax_profile(country_code: str) -> str:
    """Get comprehensive tax profile for a country."""
    try:
        data = load_json("tax_rates.json")
        countries = data.get("countries", {})

        # Try exact match first
        country = countries.get(country_code.upper())

        # Try partial match
        if not country:
            for key, val in countries.items():
                if country_code.upper() in key or country_code.upper() in val.get("name", "").upper():
                    country = val
                    break

        if not country:
            return f"Country '{country_code}' not found in knowledge base. Available: {', '.join(countries.keys())}"

        # Format the response
        output = [f"## {country.get('name', country_code)} Tax Profile\n"]

        if country.get("warning"):
            output.append(f"⚠️ WARNING: {country['warning']}\n")

        output.append(f"**Region:** {country.get('region', 'N/A')}")
        output.append(f"**Currency:** {country.get('currency', 'N/A')}")

        if country.get("eu_member"):
            output.append("**EU Member:** Yes")

        output.append("\n### Tax Rates:")
        if "personal_income_tax_top" in country:
            output.append(f"- Personal Income Tax (top rate): {country['personal_income_tax_top']*100:.1f}%")
        elif "personal_income_tax" in country:
            rate = country["personal_income_tax"]
            output.append(f"- Personal Income Tax: {rate*100:.1f}% {country.get('personal_income_tax_note', '')}")

        if "capital_gains_tax" in country:
            output.append(f"- Capital Gains Tax: {country['capital_gains_tax']*100:.1f}% {country.get('capital_gains_tax_note', '')}")

        if "dividend_tax" in country:
            output.append(f"- Dividend Tax: {country['dividend_tax']*100:.1f}% {country.get('dividend_tax_note', '')}")

        if "corporate_tax" in country:
            output.append(f"- Corporate Tax: {country['corporate_tax']*100:.1f}% {country.get('corporate_tax_note', '')}")

        if "inheritance_tax" in country:
            output.append(f"- Inheritance Tax: {country['inheritance_tax']*100:.1f}% {country.get('inheritance_tax_note', '')}")

        if "wealth_tax" in country and country["wealth_tax"]:
            output.append(f"- Wealth Tax: {country['wealth_tax']*100:.2f}% {country.get('wealth_tax_note', '')}")

        if "vat" in country:
            output.append(f"- VAT/GST: {country['vat']*100:.1f}%")

        output.append("\n### System:")
        if country.get("territorial_system"):
            output.append("- **Territorial tax system** (foreign income not taxed)")
        if country.get("worldwide_taxation"):
            output.append("- **Worldwide taxation** (all income taxed regardless of source)")
        if country.get("citizenship_taxation"):
            output.append("- **Citizenship-based taxation** (even citizens living abroad are taxed)")

        output.append(f"\n### Residency:")
        output.append(f"- Days required: {country.get('residency_days_required', '183')} days")
        if country.get("residency_notes"):
            output.append(f"- Notes: {country['residency_notes']}")

        if country.get("special_regimes"):
            output.append(f"\n### Special Regimes Available:")
            for regime in country["special_regimes"]:
                output.append(f"- {regime}")

        if country.get("exit_tax"):
            output.append(f"\n⚠️ Exit Tax: YES - {country.get('exit_tax_note', '')}")

        if country.get("notable_for"):
            output.append(f"\n### Notable For:")
            output.append(country["notable_for"])

        output.append(f"\n*Last updated: {data.get('last_updated', 'Unknown')}*")
        return "\n".join(output)

    except Exception as e:
        return f"Error loading country profile: {str(e)}"


def get_special_regime_details(regime_id: str) -> str:
    """Get details about a specific tax regime."""
    try:
        data = load_json("special_regimes.json")
        regimes = data.get("regimes", {})

        regime = regimes.get(regime_id.lower())
        if not regime:
            # Try partial match
            for key, val in regimes.items():
                if regime_id.lower() in key or regime_id.lower() in val.get("name", "").lower():
                    regime = val
                    regime_id = key
                    break

        if not regime:
            available = ", ".join(regimes.keys())
            return f"Regime '{regime_id}' not found. Available regimes: {available}"

        output = [f"## {regime.get('name', regime_id)}\n"]

        if regime.get("status") not in ["active"]:
            output.append(f"⚠️ STATUS: {regime.get('status', 'unknown').upper()} - {regime.get('status_note', '')}\n")

        if regime.get("flat_rate"):
            output.append(f"**Flat Tax Rate:** {regime['flat_rate']*100:.0f}%")
        if regime.get("flat_amount_eur"):
            output.append(f"**Flat Annual Amount:** EUR {regime['flat_amount_eur']:,}")
        if regime.get("duration_years"):
            output.append(f"**Duration:** {regime['duration_years']} years")

        if regime.get("eligibility_requirements") or regime.get("eligibility"):
            output.append("\n### Eligibility:")
            reqs = regime.get("eligibility_requirements") or regime.get("eligibility") or []
            if isinstance(reqs, list):
                for req in reqs:
                    output.append(f"- {req}")
            else:
                output.append(f"- {reqs}")

        if regime.get("benefits"):
            output.append("\n### Key Benefits:")
            for b in regime["benefits"]:
                output.append(f"✓ {b}")

        if regime.get("pitfalls"):
            output.append("\n### Watch Out For:")
            for p in regime["pitfalls"]:
                output.append(f"⚠️ {p}")

        if regime.get("best_for"):
            output.append("\n### Best For:")
            for b in regime["best_for"]:
                output.append(f"- {b}")

        if regime.get("notable_benefits"):
            output.append(f"\n{regime['notable_benefits']}")

        return "\n".join(output)

    except Exception as e:
        return f"Error loading regime: {str(e)}"


def calculate_tax_scenario(
    country_code: str,
    income_breakdown: dict,
    special_regime: str = None,
    currency: str = "USD"
) -> str:
    """Calculate estimated tax for a country and income mix."""
    try:
        data = load_json("tax_rates.json")
        countries = data.get("countries", {})

        country = countries.get(country_code.upper())
        if not country:
            for key, val in countries.items():
                if country_code.upper() in key or country_code.upper() in val.get("name", "").upper():
                    country = val
                    break

        if not country:
            return f"Country '{country_code}' not found in tax database."

        # Extract income amounts
        employment = income_breakdown.get("employment_income", 0) or 0
        business = income_breakdown.get("business_income", 0) or 0
        cg_short = income_breakdown.get("capital_gains_short", 0) or 0
        cg_long = income_breakdown.get("capital_gains_long", 0) or 0
        dividends = income_breakdown.get("dividends", 0) or 0
        interest = income_breakdown.get("interest", 0) or 0
        rental = income_breakdown.get("rental_income", 0) or 0
        crypto = income_breakdown.get("crypto_gains", 0) or 0
        foreign = income_breakdown.get("foreign_income", 0) or 0

        total_income = employment + business + cg_short + cg_long + dividends + interest + rental + crypto + foreign

        output = [f"## Tax Calculation: {country.get('name', country_code)}"]
        output.append(f"Currency: {currency} | Total Income: {total_income:,.0f}\n")

        taxes = {}

        # Employment/Business income tax
        earned_income = employment + business + rental
        if earned_income > 0:
            it_rate = country.get("personal_income_tax_top", country.get("personal_income_tax", 0))
            if isinstance(it_rate, str):
                it_rate = 0.30  # Default estimate
            it = earned_income * it_rate
            taxes["Income Tax (employment/business)"] = it
            output.append(f"**Income Tax** ({it_rate*100:.1f}% top rate on {currency} {earned_income:,.0f}): **{currency} {it:,.0f}**")

        # Capital Gains
        if cg_long > 0 or cg_short > 0:
            cg_rate = country.get("capital_gains_tax", 0)
            if isinstance(cg_rate, str):
                cg_rate = 0.20

            if special_regime == "cyprus_non_dom" and (cg_long + cg_short > 0):
                cg_tax = 0
                output.append(f"**Capital Gains Tax** (Cyprus Non-Dom: 0% on securities): **{currency} 0**")
            elif country.get("capital_gains_tax") == 0:
                cg_tax = 0
                output.append(f"**Capital Gains Tax** (0% in {country.get('name')}): **{currency} 0**")
            else:
                cg_tax = (cg_long + cg_short) * cg_rate
                taxes["Capital Gains Tax"] = cg_tax
                output.append(f"**Capital Gains Tax** ({cg_rate*100:.1f}% on {currency} {cg_long + cg_short:,.0f}): **{currency} {cg_tax:,.0f}**")

        # Dividends
        if dividends > 0:
            div_rate = country.get("dividend_tax", country.get("personal_income_tax_top", 0.25))
            if isinstance(div_rate, str):
                div_rate = 0.25

            if special_regime == "cyprus_non_dom":
                div_tax = 0
                output.append(f"**Dividend Tax** (Cyprus Non-Dom: 0%): **{currency} 0**")
            elif country.get("dividend_tax") == 0:
                div_tax = 0
                output.append(f"**Dividend Tax** (0%): **{currency} 0**")
            else:
                div_tax = dividends * div_rate
                taxes["Dividend Tax"] = div_tax
                output.append(f"**Dividend Tax** ({div_rate*100:.1f}% on {currency} {dividends:,.0f}): **{currency} {div_tax:,.0f}**")

        # Special regime overrides
        if special_regime == "italy_flat_tax_100k":
            foreign_tax = 100000  # EUR 100k flat covers all foreign income
            output = [f"## Tax Calculation: Italy (EUR 100k Flat Tax Regime)"]
            output.append(f"Total Income: {currency} {total_income:,.0f}")
            output.append(f"\n**Flat Tax on ALL Foreign Income:** EUR 100,000")
            output.append(f"**Italian Source Income Tax:** {currency} {(earned_income * 0.43):,.0f} (at top rate)")
            total_est = 100000 + (earned_income * 0.43 if earned_income > 0 else 0)
            output.append(f"\n### ESTIMATED TOTAL TAX: {currency} {total_est:,.0f}")
            return "\n".join(output)

        if special_regime == "portugal_ifici":
            eligible_income = employment + business
            flat_tax = eligible_income * 0.20
            foreign_exempt = foreign + dividends + interest + cg_long + cg_short + crypto
            output = [f"## Tax Calculation: Portugal (IFICI 20% Flat Regime)"]
            output.append(f"\n**Qualifying income at 20% flat:** {currency} {flat_tax:,.0f}")
            output.append(f"**Foreign income (potentially exempt):** {currency} {foreign_exempt:,.0f}")
            output.append(f"\n### ESTIMATED TOTAL TAX: {currency} {flat_tax:,.0f}")
            output.append("*Note: Foreign income exemption depends on specific income type and treaty position*")
            return "\n".join(output)

        # UAE - everything is 0
        if country_code.upper() == "UAE":
            output = [f"## Tax Calculation: UAE"]
            output.append(f"Total Income: {currency} {total_income:,.0f}")
            output.append("\n**Personal Income Tax: 0%**")
            output.append("**Capital Gains Tax: 0%**")
            output.append("**Dividend Tax: 0%**")
            output.append("**Crypto Tax: 0%**")
            output.append(f"\n### ESTIMATED TOTAL PERSONAL TAX: **{currency} 0**")
            output.append("\n*Note: Corporate activities may be subject to 9% corporate tax. VAT 5% on purchases.*")
            return "\n".join(output)

        total_tax = sum(taxes.values())
        effective_rate = (total_tax / total_income * 100) if total_income > 0 else 0

        output.append(f"\n### ESTIMATED TOTAL TAX: **{currency} {total_tax:,.0f}**")
        output.append(f"**Effective Rate:** {effective_rate:.1f}%")
        output.append(f"\n*Note: This is an estimate for comparison purposes. Actual tax depends on many factors including deductions, specific income treatment, and local rules. Consult a tax professional.*")

        return "\n".join(output)

    except Exception as e:
        return f"Error calculating tax scenario: {str(e)}"


def lookup_tax_treaty(country_a: str, country_b: str) -> str:
    """Look up tax treaty between two countries."""
    try:
        data = load_json("tax_treaties.json")
        treaties = data.get("key_treaties", {})

        # Try to find the treaty
        key1 = f"{country_a.upper()}-{country_b.upper()}"
        key2 = f"{country_b.upper()}-{country_a.upper()}"

        treaty = treaties.get(key1) or treaties.get(key2)

        # Try partial matching
        if not treaty:
            for key, val in treaties.items():
                countries_in_key = key.upper().split("-")
                if (country_a.upper() in countries_in_key or any(country_a.upper() in c for c in countries_in_key)) and \
                   (country_b.upper() in countries_in_key or any(country_b.upper() in c for c in countries_in_key)):
                    treaty = val
                    break

        if not treaty:
            # Check country treaty counts
            country_treaties = data.get("countries_with_most_treaties", {})
            low_treaty = data.get("low_treaty_countries", {})

            output = [f"## Tax Treaty: {country_a} ↔ {country_b}"]
            output.append(f"\nSpecific treaty details not in knowledge base.")
            output.append(f"\nGeneral OECD model rates (if treaty exists):")
            output.append(f"- Dividends: 15% (5% for substantial holdings)")
            output.append(f"- Interest: 10%")
            output.append(f"- Royalties: 10%")

            for name, count in low_treaty.items():
                if country_a.upper() in name.upper() or country_b.upper() in name.upper():
                    output.append(f"\n⚠️ Note: {name} has very few treaties ({count})")

            output.append(f"\nUse web_search to find the specific treaty details.")
            return "\n".join(output)

        output = [f"## Tax Treaty: {country_a} ↔ {country_b}\n"]

        if treaty.get("status") == "NO TREATY":
            output.append(f"❌ **NO TAX TREATY EXISTS** between these countries")
            output.append(f"\n{treaty.get('notes', '')}")
            return "\n".join(output)

        if treaty.get("signed"):
            output.append(f"**Treaty Signed:** {treaty['signed']}")

        if "dividends_withholding" in treaty:
            div = treaty["dividends_withholding"]
            if isinstance(div, dict):
                output.append(f"**Dividends WHT:** {div.get('treaty_rate', 0)*100:.0f}% (reduced to {div.get('qualified_rate', 0)*100:.0f}% for substantial holdings)")
            else:
                output.append(f"**Dividends WHT:** {div*100:.0f}%")

        if "interest_withholding" in treaty:
            output.append(f"**Interest WHT:** {treaty['interest_withholding']*100:.0f}%")

        if "royalties_withholding" in treaty:
            output.append(f"**Royalties WHT:** {treaty['royalties_withholding']*100:.0f}%")

        if treaty.get("savings_clause"):
            output.append(f"\n⚠️ **US Savings Clause:** US taxes its citizens worldwide regardless of treaty benefits")

        if treaty.get("notes"):
            output.append(f"\n**Notes:** {treaty['notes']}")

        if treaty.get("key_provisions"):
            output.append(f"\n**Key Provisions:** {treaty['key_provisions']}")

        return "\n".join(output)

    except Exception as e:
        return f"Error looking up treaty: {str(e)}"


# Tool dispatcher
async def execute_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "web_search":
        return await web_search(
            query=tool_input["query"],
            focus_country=tool_input.get("focus_country")
        )
    elif tool_name == "get_country_tax_profile":
        return get_country_tax_profile(tool_input["country_code"])
    elif tool_name == "get_special_regime_details":
        return get_special_regime_details(tool_input["regime_id"])
    elif tool_name == "calculate_tax_scenario":
        return calculate_tax_scenario(
            country_code=tool_input["country_code"],
            income_breakdown=tool_input["income_breakdown"],
            special_regime=tool_input.get("special_regime"),
            currency=tool_input.get("currency", "USD")
        )
    elif tool_name == "lookup_tax_treaty":
        return lookup_tax_treaty(
            country_a=tool_input["country_a"],
            country_b=tool_input["country_b"]
        )
    else:
        return f"Unknown tool: {tool_name}"

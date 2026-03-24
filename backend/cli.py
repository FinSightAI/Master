"""
Tax Master AI - Terminal Interface
Usage: python3 cli.py
"""
import os
import sys
import asyncio
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=False)

# Colors
RESET = "\033[0m"
BOLD = "\033[1m"
BLUE = "\033[34m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
DIM = "\033[2m"
MAGENTA = "\033[35m"

sys.path.insert(0, str(Path(__file__).parent))
from agent.orchestrator import run_agent
from agent.tools.implementations import (
    get_country_tax_profile, get_special_regime_details,
    calculate_tax_scenario, lookup_tax_treaty
)


def clear():
    os.system('clear' if os.name != 'nt' else 'cls')


def print_header():
    print(f"\n{BOLD}{CYAN}{'='*60}")
    print("  💰  Tax Master AI - יועץ מס גלובלי")
    print(f"{'='*60}{RESET}")
    print(f"{DIM}Claude Opus 4 | Adaptive Thinking | 26+ Countries{RESET}\n")


def print_user(text: str):
    print(f"\n{BOLD}{BLUE}אתה:{RESET} {text}")


def print_tool(name: str, input_data: dict):
    icons = {
        "web_search": "🔍",
        "get_country_tax_profile": "🌍",
        "get_special_regime_details": "📋",
        "calculate_tax_scenario": "🧮",
        "lookup_tax_treaty": "🤝",
    }
    icon = icons.get(name, "🔧")
    label = {
        "web_search": f"מחפש: {input_data.get('query', '')}",
        "get_country_tax_profile": f"טוען נתוני {input_data.get('country_code', '')}",
        "get_special_regime_details": f"בודק משטר {input_data.get('regime_id', '')}",
        "calculate_tax_scenario": f"מחשב מס ב-{input_data.get('country_code', '')}",
        "lookup_tax_treaty": f"אמנה: {input_data.get('country_a', '')} ↔ {input_data.get('country_b', '')}",
    }.get(name, name)
    print(f"  {DIM}{icon} {label}...{RESET}", end="\r")


def setup_profile() -> dict:
    """Interactive profile setup."""
    print(f"\n{BOLD}הגדרת פרופיל פיננסי{RESET} {DIM}(Enter לדלג){RESET}\n")

    profile = {
        "citizenships": [],
        "current_residency": None,
        "is_us_person": False,
        "income": {},
        "assets": {},
        "goals": [],
        "constraints": [],
        "notes": None,
    }

    def ask(prompt, default=""):
        val = input(f"{DIM}{prompt}:{RESET} ").strip()
        return val or default

    citizenships = ask("אזרחויות (מופרד בפסיק, כגון: ישראל, גרמניה)")
    if citizenships:
        profile["citizenships"] = [c.strip() for c in citizenships.split(",")]

    profile["current_residency"] = ask("תושבות מס נוכחית (כגון: גרמניה)") or None

    us = ask("האם אזרח/בעל גרין קארד אמריקאי? (y/n)", "n").lower()
    profile["is_us_person"] = us in ("y", "yes", "כן")

    print(f"\n{DIM}הכנסה שנתית ב-USD (0 לדלג):{RESET}")
    income_fields = [
        ("employment", "שכר/העסקה"),
        ("business", "עסק/פרילנס"),
        ("capital_gains", "רווחי הון"),
        ("dividends", "דיבידנדים"),
        ("crypto", "קריפטו"),
        ("rental", "שכר דירה"),
    ]
    for field, label in income_fields:
        val = ask(f"  {label}")
        if val:
            try:
                profile["income"][field] = float(val.replace(",", ""))
            except ValueError:
                pass

    print(f"\n{DIM}נכסים ב-USD (0 לדלג):{RESET}")
    asset_fields = [
        ("stocks", "מניות/ניירות ערך"),
        ("crypto_holdings", "אחזקות קריפטו"),
        ("real_estate", "נדל\"ן"),
        ("business_value", "שווי חברה/עסק"),
    ]
    for field, label in asset_fields:
        val = ask(f"  {label}")
        if val:
            try:
                profile["assets"][field] = float(val.replace(",", ""))
            except ValueError:
                pass

    profile["notes"] = ask("\nמידע נוסף/הקשר (תכנון אקזיט, ילדים, מגבלות...)") or None

    print(f"\n{GREEN}✓ פרופיל הוגדר{RESET}")
    return profile


def quick_tools_menu():
    """Direct tool access without AI."""
    while True:
        print(f"\n{BOLD}כלים מהירים:{RESET}")
        print("  1. פרופיל מדינה")
        print("  2. פרטי משטר מס מיוחד")
        print("  3. חישוב מס")
        print("  4. אמנת מס")
        print("  0. חזרה לצ'אט")

        choice = input(f"\n{DIM}בחר:{RESET} ").strip()

        if choice == "0":
            break
        elif choice == "1":
            country = input("קוד מדינה (UAE, GERMANY, CYPRUS...): ").strip().upper()
            print(f"\n{get_country_tax_profile(country)}")
        elif choice == "2":
            print("משטרים זמינים: portugal_ifici, uae_golden_visa, cyprus_non_dom, malta_non_dom,")
            print("                italy_flat_tax_100k, israel_oleh_exemption, swiss_lump_sum,")
            print("                greece_100k_flat_tax, georgia_virtual_zone, cyprus_60_day")
            regime = input("מזהה משטר: ").strip()
            print(f"\n{get_special_regime_details(regime)}")
        elif choice == "3":
            country = input("מדינה: ").strip().upper()
            print("הכנס הכנסות (Enter לדלג):")
            income = {}
            for f, l in [("employment_income","שכר"), ("business_income","עסק"),
                         ("capital_gains_long","רווחי הון ארוכי טווח"),
                         ("dividends","דיבידנדים"), ("crypto_gains","קריפטו")]:
                v = input(f"  {l}: ").strip()
                if v:
                    try:
                        income[f] = float(v.replace(",", ""))
                    except ValueError:
                        pass
            print(f"\n{calculate_tax_scenario(country, income)}")
        elif choice == "4":
            a = input("מדינה א: ").strip()
            b = input("מדינה ב: ").strip()
            print(f"\n{lookup_tax_treaty(a, b)}")

        input(f"\n{DIM}לחץ Enter להמשך...{RESET}")


async def chat_loop(profile: dict):
    """Main chat loop."""
    conversation_history = []

    print(f"\n{DIM}הקלד שאלה, 'כלים' לגישה ישירה לכלים, או 'יציאה' לסיום{RESET}")
    print(f"{DIM}Shift+Enter לשורה חדשה | Enter לשליחה{RESET}\n")

    while True:
        try:
            user_input = input(f"{BOLD}{BLUE}אתה:{RESET} ").strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{DIM}להתראות!{RESET}")
            break

        if not user_input:
            continue
        if user_input.lower() in ("יציאה", "exit", "quit", "q"):
            print(f"\n{DIM}להתראות! 💰{RESET}\n")
            break
        if user_input.lower() in ("כלים", "tools"):
            quick_tools_menu()
            continue
        if user_input.lower() in ("נקה", "clear"):
            conversation_history.clear()
            print(f"{GREEN}היסטוריה נוקתה{RESET}")
            continue

        print(f"\n{BOLD}{MAGENTA}יועץ מס:{RESET} ", end="", flush=True)

        full_response = ""
        active_tool = None

        try:
            async for event in run_agent(user_input, profile, conversation_history):
                if event["type"] == "text_delta":
                    if active_tool:
                        print(f"  {DIM}✓{RESET}")
                        active_tool = None
                    print(event["text"], end="", flush=True)
                    full_response += event["text"]
                elif event["type"] == "tool_start":
                    if active_tool:
                        print(f"  {DIM}✓{RESET}")
                    active_tool = event["tool"]
                    print_tool(event["tool"], event.get("input", {}))
                elif event["type"] == "tool_result":
                    active_tool = None
                elif event["type"] == "done":
                    if active_tool:
                        print(f"  {DIM}✓{RESET}")
                    print("\n")
                elif event["type"] == "error":
                    print(f"\n{YELLOW}⚠️ שגיאה: {event['message']}{RESET}")

            if full_response:
                conversation_history.append({"role": "user", "content": user_input})
                conversation_history.append({"role": "assistant", "content": full_response})
                if len(conversation_history) > 20:
                    conversation_history = conversation_history[-20:]

        except Exception as e:
            print(f"\n{YELLOW}⚠️ שגיאה: {e}{RESET}")


async def main():
    clear()
    print_header()

    # Check API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print(f"{YELLOW}⚠️  לא נמצא ANTHROPIC_API_KEY")
        print(f"   הוסף את המפתח ל-backend/.env{RESET}\n")
        sys.exit(1)

    print("1. שיחה חופשית עם היועץ")
    print("2. הגדר פרופיל פיננסי תחילה (מומלץ)")
    print("3. גישה ישירה לכלים (ללא AI)")

    choice = input(f"\n{DIM}בחר (1/2/3):{RESET} ").strip()

    profile = {}
    if choice == "2":
        profile = setup_profile()
    elif choice == "3":
        quick_tools_menu()
        return

    await chat_loop(profile)


if __name__ == "__main__":
    asyncio.run(main())

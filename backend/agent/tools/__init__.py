TOOL_DEFINITIONS = [
    {
        "name": "web_search",
        "description": """Search the web for current, up-to-date tax law information, recent legislative changes, and official guidance.
        Use this for:
        - Current tax rates that may have changed recently
        - Recent law changes (budget laws, tax reforms)
        - Official government guidance and announcements
        - Specific visa/residency program updates
        - Recent court decisions affecting tax law
        - Crypto tax treatment updates
        ALWAYS search for any rate or rule that might have changed in the past year. Prefer official government sources.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query. Be specific, include country name and tax type"
                },
                "focus_country": {
                    "type": "string",
                    "description": "Optional: focus on a specific country's information"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_country_tax_profile",
        "description": """Get a comprehensive tax profile for a specific country from the knowledge base. Returns:
        - All tax rates (income, capital gains, dividends, inheritance, wealth)
        - Special regimes available
        - Residency requirements
        - Notable features and warnings
        Use this before discussing any country's tax system.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "country_code": {
                    "type": "string",
                    "description": "Country code or name. Examples: UAE, CYPRUS, PORTUGAL, GERMANY, USA, SINGAPORE, MALTA, ISRAEL, ITALY, SWITZERLAND, UK"
                }
            },
            "required": ["country_code"]
        }
    },
    {
        "name": "get_special_regime_details",
        "description": """Get detailed information about a specific tax regime or special program. Returns full details including:
        - Eligibility requirements
        - Tax rates and benefits
        - Duration
        - Pitfalls and caveats
        Use this when a user is interested in a specific program like NHR, UAE Golden Visa, Cyprus Non-Dom, etc.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "regime_id": {
                    "type": "string",
                    "description": "Regime identifier. Examples: portugal_ifici, uae_golden_visa, cyprus_non_dom, malta_non_dom, italy_flat_tax_100k, israel_oleh_exemption, swiss_lump_sum, greece_100k_flat_tax, uae_freezone, georgia_virtual_zone, cyprus_60_day"
                }
            },
            "required": ["regime_id"]
        }
    },
    {
        "name": "calculate_tax_scenario",
        "description": """Calculate estimated annual tax liability for a specific country and income breakdown.
        Returns concrete numbers for comparison between scenarios.
        Use this to show the user exactly how much they would pay in different jurisdictions.
        Always run this for both current country AND proposed countries to show savings.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "country_code": {
                    "type": "string",
                    "description": "Country to calculate for"
                },
                "income_breakdown": {
                    "type": "object",
                    "description": "Annual income by type (in USD or local currency)",
                    "properties": {
                        "employment_income": {"type": "number", "description": "Salary/employment income"},
                        "business_income": {"type": "number", "description": "Business/self-employment income"},
                        "capital_gains_short": {"type": "number", "description": "Short-term capital gains"},
                        "capital_gains_long": {"type": "number", "description": "Long-term capital gains (held >1 year)"},
                        "dividends": {"type": "number", "description": "Dividend income"},
                        "interest": {"type": "number", "description": "Interest income"},
                        "rental_income": {"type": "number", "description": "Rental income"},
                        "crypto_gains": {"type": "number", "description": "Cryptocurrency gains"},
                        "foreign_income": {"type": "number", "description": "Income from foreign sources"}
                    }
                },
                "special_regime": {
                    "type": "string",
                    "description": "Optional: apply a special regime calculation (e.g., cyprus_non_dom, portugal_ifici, italy_flat_tax_100k)"
                },
                "currency": {
                    "type": "string",
                    "description": "Currency of income amounts (default: USD)"
                }
            },
            "required": ["country_code", "income_breakdown"]
        }
    },
    {
        "name": "lookup_tax_treaty",
        "description": """Look up the tax treaty between two countries. Returns:
        - Whether a treaty exists
        - Withholding tax rates on dividends, interest, royalties
        - Residency tiebreaker provisions
        - Key provisions relevant to the user's situation
        Use this when structuring cross-border investments or when a user has income in multiple countries.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "country_a": {
                    "type": "string",
                    "description": "First country (e.g., Germany, USA, UK)"
                },
                "country_b": {
                    "type": "string",
                    "description": "Second country"
                }
            },
            "required": ["country_a", "country_b"]
        }
    }
]

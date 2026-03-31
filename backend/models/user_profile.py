from pydantic import BaseModel
from typing import List, Optional, Dict


class IncomeProfile(BaseModel):
    employment: Optional[float] = 0
    business: Optional[float] = 0
    capital_gains: Optional[float] = 0
    dividends: Optional[float] = 0
    crypto: Optional[float] = 0
    rental: Optional[float] = 0
    other: Optional[float] = 0


class AssetProfile(BaseModel):
    stocks: Optional[float] = 0
    real_estate: Optional[float] = 0
    crypto_holdings: Optional[float] = 0
    business_value: Optional[float] = 0
    other: Optional[float] = 0


class UserProfile(BaseModel):
    citizenships: List[str] = []
    current_residency: Optional[str] = None
    years_in_country: Optional[int] = None
    is_us_person: bool = False
    income: IncomeProfile = IncomeProfile()
    assets: AssetProfile = AssetProfile()
    goals: List[str] = []
    constraints: List[str] = []
    timeline: Optional[str] = None
    notes: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    profile: Optional[UserProfile] = None
    conversation_history: List[Dict] = []
    provider: Optional[str] = None  # "gemini" | "claude" | None (uses AI_PROVIDER env var)

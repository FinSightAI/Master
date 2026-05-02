from pydantic import BaseModel, field_validator, Field
from typing import List, Optional, Dict


class IncomeProfile(BaseModel):
    employment:    Optional[float] = 0
    business:      Optional[float] = 0
    capital_gains: Optional[float] = 0
    dividends:     Optional[float] = 0
    crypto:        Optional[float] = 0
    rental:        Optional[float] = 0
    other:         Optional[float] = 0


class AssetProfile(BaseModel):
    stocks:           Optional[float] = 0
    real_estate:      Optional[float] = 0
    crypto_holdings:  Optional[float] = 0
    business_value:   Optional[float] = 0
    other:            Optional[float] = 0


class UserProfile(BaseModel):
    citizenships:    List[str]       = Field(default=[], max_length=10)
    current_residency: Optional[str] = Field(default=None, max_length=100)
    years_in_country:  Optional[int] = Field(default=None, ge=0, le=120)
    is_us_person:    bool            = False
    income:          IncomeProfile   = IncomeProfile()
    assets:          AssetProfile    = AssetProfile()
    goals:           List[str]       = Field(default=[], max_length=20)
    constraints:     List[str]       = Field(default=[], max_length=20)
    timeline:        Optional[str]   = Field(default=None, max_length=200)
    notes:           Optional[str]   = Field(default=None, max_length=1000)


class ChatMessage(BaseModel):
    role:    str = Field(max_length=20)
    content: str = Field(max_length=8000)

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ('user', 'assistant'):
            raise ValueError("role must be 'user' or 'assistant'")
        return v


class ChatRequest(BaseModel):
    message:              str            = Field(max_length=4000)
    profile:              Optional[UserProfile] = None
    conversation_history: List[Dict]     = Field(default=[], max_length=40)
    provider:             Optional[str]  = Field(default=None, max_length=20)

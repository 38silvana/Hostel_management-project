from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class GenerateBillRequest(BaseModel):
    year: int = Field(..., ge=2000, le=2100, description="Target billing year (e.g. 2026)")
    month: int = Field(..., ge=1, le=12, description="Target billing month (1-12)")

class FinalizeBillRequest(BaseModel):
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)

class MessBillResponse(BaseModel):
    id: int
    student_profile_id: int
    student_name: Optional[str] = None
    room_number: Optional[str] = None
    year: int
    month: int
    total_ticks: int
    amount: float
    is_finalized: bool
    generated_at: datetime

    class Config:
        from_attributes = True

class MonthlyBillSummaryResponse(BaseModel):
    year: int
    month: int
    total_students_billed: int
    total_revenue: float
    is_finalized: bool
    bills: List[MessBillResponse]

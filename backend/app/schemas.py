from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    student_id: Optional[int] = None
    name: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Room Schemas
class RoomBase(BaseModel):
    room_number: str
    capacity: int

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int
    occupied: int

    class Config:
        from_attributes = True

# Student Schemas
class StudentCreate(BaseModel):
    username: str
    password: str
    name: str
    roll_no: str
    room_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    room_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    fee_status: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    user_id: int
    username: str
    name: str
    roll_no: str
    room_number: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    fee_status: str

    class Config:
        from_attributes = True

# Meal Price Schemas
class MealPriceBase(BaseModel):
    breakfast_price: float
    lunch_price: float
    dinner_price: float

class MealPriceUpdate(MealPriceBase):
    pass

class MealPriceResponse(MealPriceBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

# Meal Selection Schemas
class MealSelectionCreate(BaseModel):
    date: date
    breakfast: bool
    lunch: bool
    dinner: bool

class MealSelectionResponse(BaseModel):
    id: int
    student_id: int
    date: date
    breakfast: bool
    lunch: bool
    dinner: bool

    class Config:
        from_attributes = True

class KitchenCountResponse(BaseModel):
    date: date
    total_breakfast: int
    total_lunch: int
    total_dinner: int

# Module 4: Monthly Mess Bill Schemas
class MonthlyBillGenerateRequest(BaseModel):
    month: str # Format YYYY-MM
    student_id: Optional[int] = None # None means all students

class MonthlyBillStatusUpdate(BaseModel):
    payment_status: str # 'PAID' or 'UNPAID'

class MonthlyBillResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    roll_no: str
    room_number: Optional[str] = None
    month: str
    total_breakfasts: int
    total_lunches: int
    total_dinners: int
    breakfast_rate: float
    lunch_rate: float
    dinner_rate: float
    total_amount: float
    payment_status: str
    created_at: datetime

    class Config:
        from_attributes = True

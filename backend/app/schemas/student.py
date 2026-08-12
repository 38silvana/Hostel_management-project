from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.student import FeeStatus

class StudentProfileCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    room_number: str
    permanent_address: str
    personal_contact: str
    emergency_contact: str
    fee_status: FeeStatus = FeeStatus.PENDING
    profile_photo: str | None = None

class StudentProfileUpdate(BaseModel):
    full_name: str | None = None
    room_number: str | None = None
    permanent_address: str | None = None
    personal_contact: str | None = None
    emergency_contact: str | None = None
    fee_status: FeeStatus | None = None
    profile_photo: str | None = None

class StudentProfileAdminResponse(BaseModel):
    id: int
    user_id: int
    email: str | None = None
    profile_photo: str | None = None
    full_name: str
    room_number: str
    permanent_address: str
    personal_contact: str
    emergency_contact: str
    fee_status: FeeStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StudentProfileStudentResponse(BaseModel):
    id: int
    user_id: int
    email: str | None = None
    profile_photo: str | None = None
    full_name: str
    room_number: str
    permanent_address: str
    personal_contact: str
    emergency_contact: str
    created_at: datetime

    class Config:
        from_attributes = True

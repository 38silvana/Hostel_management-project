import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class FeeStatus(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    profile_photo = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    room_number = Column(String, nullable=False)
    permanent_address = Column(String, nullable=False)
    personal_contact = Column(String, nullable=False)
    emergency_contact = Column(String, nullable=False)
    fee_status = Column(Enum(FeeStatus), default=FeeStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="student_profile")
    meal_selections = relationship("MealSelection", back_populates="student_profile", cascade="all, delete-orphan")
    mess_bills = relationship("MessBill", back_populates="student_profile", cascade="all, delete-orphan")

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # 'admin' or 'student'
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(20), unique=True, index=True, nullable=False)
    capacity = Column(Integer, default=2)
    occupied = Column(Integer, default=0)

    students = relationship("Student", back_populates="room")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    roll_no = Column(String(50), unique=True, index=True, nullable=False)
    room_number = Column(String(20), ForeignKey("rooms.room_number", ondelete="SET NULL"), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    fee_status = Column(String(20), default="PAID")

    user = relationship("User", back_populates="student_profile")
    room = relationship("Room", back_populates="students")
    meal_selections = relationship("MealSelection", back_populates="student", cascade="all, delete-orphan")
    monthly_bills = relationship("MonthlyBill", back_populates="student", cascade="all, delete-orphan")


class MealPrice(Base):
    __tablename__ = "meal_prices"

    id = Column(Integer, primary_key=True, index=True)
    breakfast_price = Column(Float, default=40.0)
    lunch_price = Column(Float, default=70.0)
    dinner_price = Column(Float, default=60.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MealSelection(Base):
    __tablename__ = "meal_selections"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    breakfast = Column(Boolean, default=True)
    lunch = Column(Boolean, default=True)
    dinner = Column(Boolean, default=True)

    student = relationship("Student", back_populates="meal_selections")


class MonthlyBill(Base):
    __tablename__ = "monthly_bills"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    month = Column(String(7), nullable=False, index=True) # YYYY-MM
    total_breakfasts = Column(Integer, default=0)
    total_lunches = Column(Integer, default=0)
    total_dinners = Column(Integer, default=0)
    breakfast_rate = Column(Float, nullable=False)
    lunch_rate = Column(Float, nullable=False)
    dinner_rate = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    payment_status = Column(String(20), default="UNPAID") # 'PAID' or 'UNPAID'
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="monthly_bills")

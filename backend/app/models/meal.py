from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Boolean, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class MealSelection(Base):
    __tablename__ = "meal_selections"

    id = Column(Integer, primary_key=True, index=True)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    meal_date = Column(Date, nullable=False, index=True)
    breakfast = Column(Boolean, default=True, nullable=False)
    dinner = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_profile_id", "meal_date", name="uq_student_meal_date"),
    )

    student_profile = relationship("StudentProfile", back_populates="meal_selections")

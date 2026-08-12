from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class MessBill(Base):
    __tablename__ = "mess_bills"

    id = Column(Integer, primary_key=True, index=True)
    student_profile_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    total_ticks = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    is_finalized = Column(Boolean, default=False, nullable=False)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_profile_id", "year", "month", name="uq_student_monthly_bill"),
    )

    student_profile = relationship("StudentProfile", back_populates="mess_bills")

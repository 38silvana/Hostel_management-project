from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.database import get_db
from app.models.user import User
from app.models.student import StudentProfile
from app.models.meal import MealSelection
from app.models.bill import MessBill
from app.schemas.bill import (
    GenerateBillRequest,
    FinalizeBillRequest,
    MessBillResponse,
    MonthlyBillSummaryResponse
)
from app.security import require_admin

router = APIRouter(prefix="/bills", tags=["Mess Bill Management"])

BASE_BILL_AMOUNT = 1800.0
BASE_TICK_LIMIT = 30
EXTRA_TICK_RATE = 55.0

def calculate_mess_bill(total_ticks: int) -> float:
    """
    SRS Billing Formula:
    - If total monthly ticks <= 30, bill = 1800.0
    - If total monthly ticks > 30, bill = 1800.0 + (total_ticks - 30) * 55.0
    """
    if total_ticks <= BASE_TICK_LIMIT:
        return BASE_BILL_AMOUNT
    else:
        extra_ticks = total_ticks - BASE_TICK_LIMIT
        return BASE_BILL_AMOUNT + (extra_ticks * EXTRA_TICK_RATE)

@router.post("/generate", response_model=MonthlyBillSummaryResponse)
def generate_or_regenerate_monthly_bills(
    payload: GenerateBillRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to generate or recalculate mess bills for a target year & month.
    Regeneration is allowed BEFORE monthly finalization. Blocked if finalized.
    """
    # 1. Check if bills for (year, month) are already finalized
    existing_bills = db.query(MessBill).filter(
        MessBill.year == payload.year,
        MessBill.month == payload.month
    ).all()

    if any(b.is_finalized for b in existing_bills):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mess bills for {payload.month}/{payload.year} have been finalized and cannot be regenerated."
        )

    # 2. Query all student profiles
    students = db.query(StudentProfile).all()
    if not students:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student profiles found to generate bills"
        )

    generated_bills = []
    total_revenue = 0.0

    for student in students:
        # Calculate total meal ticks for this student in (year, month)
        meals = db.query(MealSelection).filter(
            MealSelection.student_profile_id == student.id,
            extract('year', MealSelection.meal_date) == payload.year,
            extract('month', MealSelection.meal_date) == payload.month
        ).all()

        total_ticks = sum((1 if m.breakfast else 0) + (1 if m.dinner else 0) for m in meals)
        bill_amount = calculate_mess_bill(total_ticks)

        # Upsert: check if bill record already exists for student + year + month
        existing_bill = db.query(MessBill).filter(
            MessBill.student_profile_id == student.id,
            MessBill.year == payload.year,
            MessBill.month == payload.month
        ).first()

        if existing_bill:
            existing_bill.total_ticks = total_ticks
            existing_bill.amount = bill_amount
            bill_obj = existing_bill
        else:
            bill_obj = MessBill(
                student_profile_id=student.id,
                year=payload.year,
                month=payload.month,
                total_ticks=total_ticks,
                amount=bill_amount,
                is_finalized=False
            )
            db.add(bill_obj)

        db.flush()
        total_revenue += bill_amount

        res_item = MessBillResponse.model_validate(bill_obj)
        res_item.student_name = student.full_name
        res_item.room_number = student.room_number
        generated_bills.append(res_item)

    db.commit()

    return MonthlyBillSummaryResponse(
        year=payload.year,
        month=payload.month,
        total_students_billed=len(generated_bills),
        total_revenue=total_revenue,
        is_finalized=False,
        bills=generated_bills
    )

@router.post("/finalize", response_model=MonthlyBillSummaryResponse)
def finalize_monthly_bills(
    payload: FinalizeBillRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to finalize monthly mess bills, locking them from further regeneration."""
    bills = db.query(MessBill).filter(
        MessBill.year == payload.year,
        MessBill.month == payload.month
    ).all()

    if not bills:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No generated bills found for {payload.month}/{payload.year}. Generate bills first before finalization."
        )

    total_revenue = 0.0
    bill_responses = []

    for b in bills:
        b.is_finalized = True
        total_revenue += b.amount
        res = MessBillResponse.model_validate(b)
        res.student_name = b.student_profile.full_name if b.student_profile else None
        res.room_number = b.student_profile.room_number if b.student_profile else None
        bill_responses.append(res)

    db.commit()

    return MonthlyBillSummaryResponse(
        year=payload.year,
        month=payload.month,
        total_students_billed=len(bill_responses),
        total_revenue=total_revenue,
        is_finalized=True,
        bills=bill_responses
    )

@router.get("", response_model=MonthlyBillSummaryResponse)
def get_monthly_bills(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to view generated bills summary for a target year & month."""
    bills = db.query(MessBill).filter(
        MessBill.year == year,
        MessBill.month == month
    ).all()

    if not bills:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No bills generated for {month}/{year} yet."
        )

    total_revenue = sum(b.amount for b in bills)
    is_finalized = all(b.is_finalized for b in bills)
    bill_responses = []

    for b in bills:
        res = MessBillResponse.model_validate(b)
        res.student_name = b.student_profile.full_name if b.student_profile else None
        res.room_number = b.student_profile.room_number if b.student_profile else None
        bill_responses.append(res)

    return MonthlyBillSummaryResponse(
        year=year,
        month=month,
        total_students_billed=len(bill_responses),
        total_revenue=total_revenue,
        is_finalized=is_finalized,
        bills=bill_responses
    )

@router.get("/student/{student_id}", response_model=List[MessBillResponse])
def get_student_billing_history(
    student_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to view complete billing history for a student."""
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )

    bills = db.query(MessBill).filter(MessBill.student_profile_id == student_id).order_by(MessBill.year.desc(), MessBill.month.desc()).all()
    results = []
    for b in bills:
        res = MessBillResponse.model_validate(b)
        res.student_name = student.full_name
        res.room_number = student.room_number
        results.append(res)
    return results

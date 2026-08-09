from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import calendar

from app.db import get_db
from app.models import MonthlyBill, Student, MealSelection, MealPrice, User
from app.schemas import MonthlyBillGenerateRequest, MonthlyBillStatusUpdate, MonthlyBillResponse
from app.auth import require_admin, require_student, get_current_user

router = APIRouter(prefix="/api/billing", tags=["Monthly Mess Billing"])

@router.post("/generate", response_model=List[MonthlyBillResponse])
def generate_monthly_bills(
    data: MonthlyBillGenerateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Validate month format YYYY-MM
    try:
        year, month_num = map(int, data.month.split("-"))
        _, days_in_month = calendar.monthrange(year, month_num)
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num, days_in_month)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid month format. Expected YYYY-MM")

    # Get current meal rates
    prices = db.query(MealPrice).order_by(MealPrice.id.desc()).first()
    if not prices:
        prices = MealPrice(breakfast_price=40.0, lunch_price=70.0, dinner_price=60.0)
        db.add(prices)
        db.commit()
        db.refresh(prices)

    # Filter target students
    student_query = db.query(Student)
    if data.student_id:
        student_query = student_query.filter(Student.id == data.student_id)
    students = student_query.all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found for bill generation")

    generated_bills = []
    for student in students:
        # Get explicit selections for student in this month
        selections = db.query(MealSelection).filter(
            MealSelection.student_id == student.id,
            MealSelection.date >= start_date,
            MealSelection.date <= end_date
        ).all()

        selection_map = {s.date: s for s in selections}

        total_breakfasts = 0
        total_lunches = 0
        total_dinners = 0

        # Calculate meal counts for every day of the month
        for day in range(1, days_in_month + 1):
            curr_date = date(year, month_num, day)
            if curr_date in selection_map:
                sel = selection_map[curr_date]
                if sel.breakfast:
                    total_breakfasts += 1
                if sel.lunch:
                    total_lunches += 1
                if sel.dinner:
                    total_dinners += 1
            else:
                # Default behavior: student attended all 3 meals unless opted out
                total_breakfasts += 1
                total_lunches += 1
                total_dinners += 1

        total_amount = (
            (total_breakfasts * prices.breakfast_price) +
            (total_lunches * prices.lunch_price) +
            (total_dinners * prices.dinner_price)
        )

        bill = db.query(MonthlyBill).filter(
            MonthlyBill.student_id == student.id,
            MonthlyBill.month == data.month
        ).first()

        if bill:
            bill.total_breakfasts = total_breakfasts
            bill.total_lunches = total_lunches
            bill.total_dinners = total_dinners
            bill.breakfast_rate = prices.breakfast_price
            bill.lunch_rate = prices.lunch_price
            bill.dinner_rate = prices.dinner_price
            bill.total_amount = total_amount
        else:
            bill = MonthlyBill(
                student_id=student.id,
                month=data.month,
                total_breakfasts=total_breakfasts,
                total_lunches=total_lunches,
                total_dinners=total_dinners,
                breakfast_rate=prices.breakfast_price,
                lunch_rate=prices.lunch_price,
                dinner_rate=prices.dinner_price,
                total_amount=total_amount,
                payment_status="UNPAID"
            )
            db.add(bill)

        db.commit()
        db.refresh(bill)

        generated_bills.append(MonthlyBillResponse(
            id=bill.id,
            student_id=student.id,
            student_name=student.name,
            roll_no=student.roll_no,
            room_number=student.room_number,
            month=bill.month,
            total_breakfasts=bill.total_breakfasts,
            total_lunches=bill.total_lunches,
            total_dinners=bill.total_dinners,
            breakfast_rate=bill.breakfast_rate,
            lunch_rate=bill.lunch_rate,
            dinner_rate=bill.dinner_rate,
            total_amount=bill.total_amount,
            payment_status=bill.payment_status,
            created_at=bill.created_at
        ))

    return generated_bills

@router.get("/admin", response_model=List[MonthlyBillResponse])
def get_all_bills_admin(
    month: Optional[str] = None,
    payment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(MonthlyBill)
    if month:
        query = query.filter(MonthlyBill.month == month)
    if payment_status:
        query = query.filter(MonthlyBill.payment_status == payment_status)

    bills = query.all()
    res = []
    for bill in bills:
        student = bill.student
        res.append(MonthlyBillResponse(
            id=bill.id,
            student_id=bill.student_id,
            student_name=student.name if student else "Unknown",
            roll_no=student.roll_no if student else "N/A",
            room_number=student.room_number if student else None,
            month=bill.month,
            total_breakfasts=bill.total_breakfasts,
            total_lunches=bill.total_lunches,
            total_dinners=bill.total_dinners,
            breakfast_rate=bill.breakfast_rate,
            lunch_rate=bill.lunch_rate,
            dinner_rate=bill.dinner_rate,
            total_amount=bill.total_amount,
            payment_status=bill.payment_status,
            created_at=bill.created_at
        ))
    return res

@router.put("/{bill_id}/status", response_model=MonthlyBillResponse)
def update_bill_payment_status(
    bill_id: int,
    data: MonthlyBillStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    if data.payment_status not in ["PAID", "UNPAID"]:
        raise HTTPException(status_code=400, detail="Status must be 'PAID' or 'UNPAID'")

    bill = db.query(MonthlyBill).filter(MonthlyBill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill.payment_status = data.payment_status
    db.commit()
    db.refresh(bill)

    student = bill.student
    return MonthlyBillResponse(
        id=bill.id,
        student_id=bill.student_id,
        student_name=student.name if student else "Unknown",
        roll_no=student.roll_no if student else "N/A",
        room_number=student.room_number if student else None,
        month=bill.month,
        total_breakfasts=bill.total_breakfasts,
        total_lunches=bill.total_lunches,
        total_dinners=bill.total_dinners,
        breakfast_rate=bill.breakfast_rate,
        lunch_rate=bill.lunch_rate,
        dinner_rate=bill.dinner_rate,
        total_amount=bill.total_amount,
        payment_status=bill.payment_status,
        created_at=bill.created_at
    )

@router.get("/student", response_model=List[MonthlyBillResponse])
def get_student_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    bills = db.query(MonthlyBill).filter(MonthlyBill.student_id == student.id).all()
    res = []
    for bill in bills:
        res.append(MonthlyBillResponse(
            id=bill.id,
            student_id=bill.student_id,
            student_name=student.name,
            roll_no=student.roll_no,
            room_number=student.room_number,
            month=bill.month,
            total_breakfasts=bill.total_breakfasts,
            total_lunches=bill.total_lunches,
            total_dinners=bill.total_dinners,
            breakfast_rate=bill.breakfast_rate,
            lunch_rate=bill.lunch_rate,
            dinner_rate=bill.dinner_rate,
            total_amount=bill.total_amount,
            payment_status=bill.payment_status,
            created_at=bill.created_at
        ))
    return res

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date as DateType, datetime, timedelta
from typing import List, Optional

from app.db import get_db
from app.models import MealPrice, MealSelection, Student, User
from app.schemas import MealPriceUpdate, MealPriceResponse, MealSelectionCreate, MealSelectionResponse, KitchenCountResponse
from app.auth import require_admin, require_student, get_current_user

router = APIRouter(prefix="/api/meals", tags=["Meals"])

@router.get("/prices", response_model=MealPriceResponse)
def get_meal_prices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prices = db.query(MealPrice).order_by(MealPrice.id.desc()).first()
    if not prices:
        prices = MealPrice(breakfast_price=40.0, lunch_price=70.0, dinner_price=60.0)
        db.add(prices)
        db.commit()
        db.refresh(prices)
    return prices

@router.post("/prices", response_model=MealPriceResponse)
def update_meal_prices(data: MealPriceUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    prices = db.query(MealPrice).order_by(MealPrice.id.desc()).first()
    if not prices:
        prices = MealPrice()
        db.add(prices)

    prices.breakfast_price = data.breakfast_price
    prices.lunch_price = data.lunch_price
    prices.dinner_price = data.dinner_price
    prices.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(prices)
    return prices

@router.get("/selection", response_model=List[MealSelectionResponse])
def get_student_selections(
    start_date: Optional[DateType] = None,
    end_date: Optional[DateType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student":
        student = current_user.student_profile
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        student_id = student.id
    else:
        # Admin can view all or specify student in query parameter if needed
        student_id = None

    query = db.query(MealSelection)
    if student_id:
        query = query.filter(MealSelection.student_id == student_id)
    if start_date:
        query = query.filter(MealSelection.date >= start_date)
    if end_date:
        query = query.filter(MealSelection.date <= end_date)

    return query.all()

@router.post("/selection", response_model=MealSelectionResponse)
def save_student_selection(
    data: MealSelectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    selection = db.query(MealSelection).filter(
        MealSelection.student_id == student.id,
        MealSelection.date == data.date
    ).first()

    if selection:
        selection.breakfast = data.breakfast
        selection.lunch = data.lunch
        selection.dinner = data.dinner
    else:
        selection = MealSelection(
            student_id=student.id,
            date=data.date,
            breakfast=data.breakfast,
            lunch=data.lunch,
            dinner=data.dinner
        )
        db.add(selection)

    db.commit()
    db.refresh(selection)
    return selection

@router.get("/kitchen", response_model=KitchenCountResponse)
def get_kitchen_summary(
    target_date: Optional[DateType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not target_date:
        target_date = DateType.today() + timedelta(days=1) # Default to tomorrow's count

    selections = db.query(MealSelection).filter(MealSelection.date == target_date).all()
    
    # Also factor in active students who haven't explicitly set preferences (assume default True if not opted out)
    total_students_count = db.query(Student).count()
    
    # If students have specific selections:
    selected_student_ids = {s.student_id for s in selections}
    unselected_count = max(0, total_students_count - len(selected_student_ids))

    breakfast_count = sum(1 for s in selections if s.breakfast) + unselected_count
    lunch_count = sum(1 for s in selections if s.lunch) + unselected_count
    dinner_count = sum(1 for s in selections if s.dinner) + unselected_count

    return KitchenCountResponse(
        date=target_date,
        total_breakfast=breakfast_count,
        total_lunch=lunch_count,
        total_dinner=dinner_count
    )

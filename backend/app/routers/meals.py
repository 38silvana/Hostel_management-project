from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.student import StudentProfile
from app.models.meal import MealSelection
from app.schemas.meal import (
    MealSelectionCreateUpdate,
    MealSelectionResponse,
    MealCountsResponse
)
from app.security import (
    require_student,
    require_admin
)

router = APIRouter(prefix="/meals", tags=["Meal Management"])

CUTOFF_HOUR = 22  # 10:00 PM local server time

def check_10pm_cutoff(simulated_current_time: Optional[datetime] = None):
    """
    Check if the current time has passed the 10:00 PM cutoff for selecting tomorrow's meals.
    Raises HTTP 400 Bad Request if hour >= 22.
    """
    now = simulated_current_time or datetime.now()
    if now.hour >= CUTOFF_HOUR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The 10:00 PM cutoff time has passed for selecting tomorrow's meals. Current time: {now.strftime('%H:%M:%S')}"
        )

@router.post("/tomorrow", response_model=MealSelectionResponse)
def select_or_update_tomorrow_meals(
    payload: MealSelectionCreateUpdate,
    simulated_hour: Optional[int] = Query(None, description="Optional parameter to simulate server hour for testing cutoff"),
    current_student_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Student-only endpoint to select or update tomorrow's breakfast & dinner choices.
    Allows multiple modifications before 10:00 PM. Rejects after 10:00 PM.
    """
    # Verify student profile exists
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_student_user.id).first()
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )

    # 10 PM Cutoff Verification
    if simulated_hour is not None:
        if simulated_hour >= CUTOFF_HOUR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The 10:00 PM cutoff time has passed for selecting tomorrow's meals. (Simulated Hour: {simulated_hour}:00)"
            )
    else:
        check_10pm_cutoff()

    tomorrow = date.today() + timedelta(days=1)

    # Upsert: check if record already exists for (student_profile_id, tomorrow)
    existing_selection = db.query(MealSelection).filter(
        MealSelection.student_profile_id == student_profile.id,
        MealSelection.meal_date == tomorrow
    ).first()

    if existing_selection:
        existing_selection.breakfast = payload.breakfast
        existing_selection.dinner = payload.dinner
        db.commit()
        db.refresh(existing_selection)
        return existing_selection
    else:
        new_selection = MealSelection(
            student_profile_id=student_profile.id,
            meal_date=tomorrow,
            breakfast=payload.breakfast,
            dinner=payload.dinner
        )
        db.add(new_selection)
        db.commit()
        db.refresh(new_selection)
        return new_selection

@router.get("/my-selection/tomorrow", response_model=MealSelectionResponse)
def get_my_tomorrow_selection(
    current_student_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """Student-only endpoint to view own meal selection for tomorrow."""
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_student_user.id).first()
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found"
        )

    tomorrow = date.today() + timedelta(days=1)
    selection = db.query(MealSelection).filter(
        MealSelection.student_profile_id == student_profile.id,
        MealSelection.meal_date == tomorrow
    ).first()

    if not selection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No meal selection submitted for tomorrow yet"
        )
    return selection

@router.get("/counts/tomorrow", response_model=MealCountsResponse)
def get_tomorrow_kitchen_counts(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only Kitchen Dashboard endpoint: Aggregate breakfast and dinner counts for tomorrow."""
    tomorrow = date.today() + timedelta(days=1)
    return calculate_meal_counts(db, tomorrow)

@router.get("/counts", response_model=MealCountsResponse)
def get_kitchen_counts_by_date(
    meal_date: date = Query(..., description="Target date for meal counts YYYY-MM-DD"),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only Kitchen Dashboard endpoint: Aggregate breakfast and dinner counts for a specific date."""
    return calculate_meal_counts(db, meal_date)

def calculate_meal_counts(db: Session, target_date: date) -> MealCountsResponse:
    selections = db.query(MealSelection).filter(MealSelection.meal_date == target_date).all()
    bf_count = sum(1 for s in selections if s.breakfast)
    dn_count = sum(1 for s in selections if s.dinner)
    return MealCountsResponse(
        meal_date=target_date,
        total_breakfast_count=bf_count,
        total_dinner_count=dn_count,
        total_students_selected=len(selections)
    )

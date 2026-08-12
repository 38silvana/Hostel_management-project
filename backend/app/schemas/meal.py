from datetime import date, datetime
from pydantic import BaseModel

class MealSelectionCreateUpdate(BaseModel):
    breakfast: bool = True
    dinner: bool = True

class MealSelectionResponse(BaseModel):
    id: int
    student_profile_id: int
    meal_date: date
    breakfast: bool
    dinner: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MealCountsResponse(BaseModel):
    meal_date: date
    total_breakfast_count: int
    total_dinner_count: int
    total_students_selected: int

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db import get_db
from app.models import User, Student
from app.auth import verify_password, create_access_token, get_current_user
from app.schemas import Token, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    student_id = None
    student_name = None
    if user.role == "student" and user.student_profile:
        student_id = user.student_profile.id
        student_name = user.student_profile.name

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "student_id": student_id,
        "name": student_name or user.username
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student_id = None
    name = current_user.username
    roll_no = None
    room_number = None
    
    if current_user.role == "student" and current_user.student_profile:
        sp = current_user.student_profile
        student_id = sp.id
        name = sp.name
        roll_no = sp.roll_no
        room_number = sp.room_number

    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "student_id": student_id,
        "name": name,
        "roll_no": roll_no,
        "room_number": room_number
    }

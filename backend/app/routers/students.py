from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.models import Student, User, Room
from app.schemas import StudentCreate, StudentUpdate, StudentResponse
from app.auth import get_password_hash, require_admin, get_current_user

router = APIRouter(prefix="/api/students", tags=["Students"])

@router.get("/", response_model=List[StudentResponse])
def list_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    students = db.query(Student).all()
    res = []
    for s in students:
        res.append(StudentResponse(
            id=s.id,
            user_id=s.user_id,
            username=s.user.username if s.user else "",
            name=s.name,
            roll_no=s.roll_no,
            room_number=s.room_number,
            phone=s.phone,
            address=s.address,
            fee_status=s.fee_status
        ))
    return res

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(Student).filter(Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentResponse(
        id=s.id,
        user_id=s.user_id,
        username=s.user.username if s.user else "",
        name=s.name,
        roll_no=s.roll_no,
        room_number=s.room_number,
        phone=s.phone,
        address=s.address,
        fee_status=s.fee_status
    )

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(data: StudentCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    # Check if username or roll_no exists
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(Student).filter(Student.roll_no == data.roll_no).first():
        raise HTTPException(status_code=400, detail="Roll number already exists")

    # Check room capacity if room specified
    if data.room_number:
        room = db.query(Room).filter(Room.room_number == data.room_number).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room.occupied >= room.capacity:
            raise HTTPException(status_code=400, detail="Room is already at full capacity")
        room.occupied += 1

    # Create User account
    user = User(
        username=data.username,
        hashed_password=get_password_hash(data.password),
        role="student"
    )
    db.add(user)
    db.flush()

    # Create Student profile
    student = Student(
        user_id=user.id,
        name=data.name,
        roll_no=data.roll_no,
        room_number=data.room_number,
        phone=data.phone,
        address=data.address
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    return StudentResponse(
        id=student.id,
        user_id=user.id,
        username=user.username,
        name=student.name,
        roll_no=student.roll_no,
        room_number=student.room_number,
        phone=student.phone,
        address=student.address,
        fee_status=student.fee_status
    )

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if data.room_number is not None and data.room_number != student.room_number:
        # Handle old room occupancy decrement
        if student.room_number:
            old_room = db.query(Room).filter(Room.room_number == student.room_number).first()
            if old_room and old_room.occupied > 0:
                old_room.occupied -= 1

        # Handle new room occupancy increment
        if data.room_number != "":
            new_room = db.query(Room).filter(Room.room_number == data.room_number).first()
            if not new_room:
                raise HTTPException(status_code=404, detail="New room not found")
            if new_room.occupied >= new_room.capacity:
                raise HTTPException(status_code=400, detail="New room is full")
            new_room.occupied += 1
            student.room_number = data.room_number
        else:
            student.room_number = None

    if data.name is not None:
        student.name = data.name
    if data.phone is not None:
        student.phone = data.phone
    if data.address is not None:
        student.address = data.address
    if data.fee_status is not None:
        student.fee_status = data.fee_status

    db.commit()
    db.refresh(student)

    return StudentResponse(
        id=student.id,
        user_id=student.user_id,
        username=student.user.username if student.user else "",
        name=student.name,
        roll_no=student.roll_no,
        room_number=student.room_number,
        phone=student.phone,
        address=student.address,
        fee_status=student.fee_status
    )

@router.delete("/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.room_number:
        room = db.query(Room).filter(Room.room_number == student.room_number).first()
        if room and room.occupied > 0:
            room.occupied -= 1

    user = student.user
    db.delete(student)
    if user:
        db.delete(user)

    db.commit()
    return {"message": "Student deleted successfully"}

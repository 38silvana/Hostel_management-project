import os
import uuid
from typing import List, Union, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.schemas.student import (
    StudentProfileCreate,
    StudentProfileUpdate,
    StudentProfileAdminResponse,
    StudentProfileStudentResponse
)
from app.security import (
    get_password_hash,
    get_current_user,
    require_admin
)

router = APIRouter(prefix="/students", tags=["Student Management & Profile View"])

UPLOAD_DIR = os.path.join("uploads", "profile_photos")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("", response_model=StudentProfileAdminResponse, status_code=status.HTTP_201_CREATED)
def create_student_profile(
    payload: StudentProfileCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to create a Student user account and profile."""
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    # 1. Create User
    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(user)
    db.flush()

    # 2. Create StudentProfile
    profile = StudentProfile(
        user_id=user.id,
        profile_photo=payload.profile_photo,
        full_name=payload.full_name,
        room_number=payload.room_number,
        permanent_address=payload.permanent_address,
        personal_contact=payload.personal_contact,
        emergency_contact=payload.emergency_contact,
        fee_status=payload.fee_status
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    res = StudentProfileAdminResponse.model_validate(profile)
    res.email = user.email
    return res

@router.get("", response_model=List[StudentProfileAdminResponse])
def list_students(
    search: Optional[str] = Query(None, description="Search query across name, email, or room number"),
    name: Optional[str] = Query(None, description="Filter specifically by full name"),
    email: Optional[str] = Query(None, description="Filter specifically by email/username"),
    room_number: Optional[str] = Query(None, description="Filter specifically by room number"),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to view all student profiles.
    Supports search filtering across name, email, and room number.
    """
    query = db.query(StudentProfile).join(User)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                StudentProfile.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                StudentProfile.room_number.ilike(search_pattern)
            )
        )

    if name:
        query = query.filter(StudentProfile.full_name.ilike(f"%{name.strip()}%"))

    if email:
        query = query.filter(User.email.ilike(f"%{email.strip()}%"))

    if room_number:
        query = query.filter(StudentProfile.room_number.ilike(f"%{room_number.strip()}%"))

    profiles = query.all()
    results = []
    for p in profiles:
        res = StudentProfileAdminResponse.model_validate(p)
        res.email = p.user.email if p.user else None
        results.append(res)
    return results

@router.get("/me", response_model=Union[StudentProfileStudentResponse, StudentProfileAdminResponse])
@router.get("/profile", response_model=Union[StudentProfileStudentResponse, StudentProfileAdminResponse])
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    View logged in user's own student profile.
    Students strictly view StudentProfileStudentResponse (omitting fee_status & billing info).
    """
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for current user"
        )

    if current_user.role == UserRole.ADMIN:
        res = StudentProfileAdminResponse.model_validate(profile)
        res.email = current_user.email
        return res
    else:
        # Student view - strictly omits fee_status
        res = StudentProfileStudentResponse.model_validate(profile)
        res.email = current_user.email
        return res

@router.get("/{student_id}", response_model=Union[StudentProfileAdminResponse, StudentProfileStudentResponse])
def get_student_by_id(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get student profile by profile ID.
    - Admin: Can view any student profile (includes fee_status & billing info).
    - Student: Can view ONLY their own profile (omits fee_status). IDOR Check returns HTTP 403 Forbidden for other IDs.
    - Non-existent student ID returns HTTP 404 Not Found.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student profile with ID {student_id} not found"
        )

    # IDOR Security Protection
    if current_user.role == UserRole.STUDENT:
        if profile.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Students are strictly forbidden from viewing another student's profile"
            )
        res = StudentProfileStudentResponse.model_validate(profile)
        res.email = profile.user.email if profile.user else None
        return res

    # Admin View
    res = StudentProfileAdminResponse.model_validate(profile)
    res.email = profile.user.email if profile.user else None
    return res

@router.put("/{student_id}", response_model=StudentProfileAdminResponse)
def update_student_profile(
    student_id: int,
    payload: StudentProfileUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to update student profile fields."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student profile with ID {student_id} not found"
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(profile, field, val)

    if payload.full_name and profile.user:
        profile.user.full_name = payload.full_name

    db.commit()
    db.refresh(profile)

    res = StudentProfileAdminResponse.model_validate(profile)
    res.email = profile.user.email if profile.user else None
    return res

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_profile(
    student_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to delete student profile and associated user account."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student profile with ID {student_id} not found"
        )

    user = profile.user
    db.delete(profile)
    if user:
        db.delete(user)
    db.commit()
    return None

@router.post("/{student_id}/upload-photo")
def upload_profile_photo(
    student_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile photo file for a student."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student profile with ID {student_id} not found"
        )

    if current_user.role == UserRole.STUDENT and profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Students can upload photo only for their own profile"
        )

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"photo_student_{student_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    relative_url = f"/uploads/profile_photos/{filename}"
    profile.profile_photo = relative_url
    db.commit()
    db.refresh(profile)

    return {
        "message": "Profile photo uploaded successfully",
        "profile_photo": relative_url
    }

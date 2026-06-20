from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.academic import Batch, BatchActiveTerm, Department
from app.models.user import User, UserRole
from app.models.profiles import Student
from datetime import timedelta
from app.schemas.user import (
    UserLoginRequest,
    StudentSignupRequest,
    TokenResponse,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.utils.auth import verify_password, create_access_token, hash_password, decode_access_token
from app.utils.dependencies import get_current_user
from app.utils.email import send_reset_password_email
import os
import uuid
from pathlib import Path

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_app_role(role: str | None) -> str | None:
    if role == "SUPER_ADMIN":
        return "SuperAdmin"
    if role == "RESOURCE_MANAGER":
        return "ResourceManager"
    if role == "SCHEDULER":
        return "Scheduler"
    if role == "LECTURER":
        return "Lecturer"
    if role == "STUDENT":
        return "Student"
    return role


def _parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _semester_label(semester_number: int) -> str:
    year = ((semester_number - 1) // 2) + 1
    semester = 1 if semester_number % 2 == 1 else 2
    return f"Year {year} Semester {semester}"


SEMESTER_NAME_TO_NUMBER = {
    _semester_label(number): number
    for number in range(1, 11)
}


def _resolve_batch_semester(batch: Batch, db: Session) -> tuple[int, str]:
    active_term = (
        db.query(BatchActiveTerm)
        .filter(
            BatchActiveTerm.batch_id == batch.batch_id,
            BatchActiveTerm.is_active.is_(True),
        )
        .order_by(BatchActiveTerm.id.desc())
        .first()
    )

    if active_term and active_term.semester_name in SEMESTER_NAME_TO_NUMBER:
        semester_number = SEMESTER_NAME_TO_NUMBER[active_term.semester_name]
        semester_name = active_term.semester_name
    else:
        semester_number = batch.current_semester
        semester_name = _semester_label(semester_number)

    return semester_number, semester_name


def _serialize_auth_user(user: User, db: Session | None = None) -> dict:
    student_profile = None
    if user.student_profile:
        reg_no = getattr(user.student_profile, "index_number", None) or getattr(
            user.student_profile, "reg_no", None
        )
        registration_number = getattr(user.student_profile, "registration_number", None)
        raw_batch_id = getattr(user.student_profile, "batch_id", None)
        if raw_batch_id is None:
            raw_batch_id = getattr(user.student_profile, "batch", None)

        batch_id = _parse_int(raw_batch_id)
        batch_code = None
        degree_name = None
        degree_code = None
        department_name = None
        semester_name = None
        semester_number = None

        if db is not None and batch_id is not None:
            batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
            if batch is not None:
                batch_code = batch.batch_code
                if batch.degree:
                    degree_name = batch.degree.name
                    degree_code = batch.degree.code
                    if batch.degree.department:
                        department_name = batch.degree.department.name
                semester_number, semester_name = _resolve_batch_semester(batch, db)

        student_profile = {
            "reg_no": reg_no,
            "registration_number": registration_number,
            "batch_id": batch_id,
            "batch_code": batch_code,
            "degree_name": degree_name,
            "degree_code": degree_code,
            "department_name": department_name,
            "semester_name": semester_name,
            "semester_number": semester_number,
        }

    lecturer_profile = None
    if user.lecturer_profile:
        dept_id = _parse_int(user.lecturer_profile.department)
        department_name = None
        if db is not None and dept_id is not None:
            department = db.query(Department).filter(Department.dept_id == dept_id).first()
            department_name = department.name if department else None

        lecturer_profile = {
            "staff_id": user.lecturer_profile.employee_id,
            "dept_id": dept_id,
            "department_name": department_name,
            "designation": None,
        }

    resource_manager_profile = None
    if user.resource_manager_profile:
        resource_manager_profile = {
            "assigned_section": user.resource_manager_profile.assigned_section,
        }

    return {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": _to_app_role(user.role),
        "is_active": user.is_active,
        "created_at": user.created_at,
        "contact_number": user.contact_number,
        "profile_image": user.profile_image,
        "student_profile": student_profile,
        "lecturer_profile": lecturer_profile,
        "resource_manager_profile": resource_manager_profile,
    }


@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={
            "user_id": user.user_id,
            "sub": user.email,
            "role": user.role,
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _serialize_auth_user(user, db),
    }


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(request: StudentSignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    existing_student = (
        db.query(Student)
        .filter(Student.index_number == request.registration_number)
        .first()
    )
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration number already exists",
        )

    batch_record = db.query(Batch).filter(Batch.batch_id == request.batch_id).first()
    if not batch_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected batch not found",
        )

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        role="STUDENT",
        is_active=True,
    )
    db.add(user)
    db.flush()

    student_profile = Student(
        user_id=user.user_id,
        index_number=request.registration_number,
        batch=request.batch_id,
    )
    db.add(student_profile)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={
            "user_id": user.user_id,
            "sub": user.email,
            "role": user.role,
        }
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _serialize_auth_user(user, db),
    }


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _serialize_auth_user(current_user, db)


class UpdateMeRequest(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    contact_number: Optional[str] = Field(default=None, max_length=15)


@router.put("/me", response_model=UserResponse)
def update_me(
    request: UpdateMeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = request.model_dump(exclude_unset=True)

    if "first_name" in data:
        current_user.first_name = data["first_name"].strip()
    if "last_name" in data:
        current_user.last_name = data["last_name"].strip()
    if "contact_number" in data:
        contact_number = data["contact_number"].strip()
        current_user.contact_number = contact_number or None

    db.commit()
    db.refresh(current_user)
    return _serialize_auth_user(current_user, db)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(request.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


@router.post("/upload-profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a profile image for the current user.
    Image is saved to static/uploads and path is stored in database.
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only image files (JPEG, PNG, GIF, WebP) are allowed",
        )

    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File size must be less than 5MB",
        )

    try:
        # Create uploads directory if it doesn't exist
        uploads_dir = Path(__file__).parent.parent.parent / "static" / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        file_extension = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = uploads_dir / unique_filename

        # Save file
        with open(file_path, "wb") as f:
            f.write(file_content)

        # Store relative path in database
        relative_path = f"/static/uploads/{unique_filename}"
        current_user.profile_image = relative_path
        db.commit()
        db.refresh(current_user)

        return {
            "message": "Profile image uploaded successfully",
            "profile_image": relative_path,
            "user_id": current_user.user_id,
        }

    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(err)}",
        )


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        # Generate short-lived token (15 mins)
        reset_token = create_access_token(
            data={"sub": user.email, "type": "password_reset"},
            expires_delta=timedelta(minutes=15)
        )
        send_reset_password_email(user.email, reset_token)
    
    # Return success even if user not found to prevent email enumeration
    return {"message": "If that email address is in our database, we will send you an email to reset your password."}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = decode_access_token(request.token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
        
    user.password_hash = hash_password(request.new_password)
    db.commit()
    
    return {"message": "Password has been reset successfully"}

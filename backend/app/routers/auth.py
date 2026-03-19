from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user import User, UserRole
from app.models.profiles import Student
from app.schemas.user import (
    UserLoginRequest,
    StudentSignupRequest,
    TokenResponse,
    UserResponse,
)
from app.utils.auth import verify_password, create_access_token, hash_password
from app.utils.dependencies import get_current_user

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


def _serialize_auth_user(user: User) -> dict:
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
        "student_profile": None,
        "lecturer_profile": None,
        "resource_manager_profile": None,
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
        "user": _serialize_auth_user(user),
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
        .filter(Student.registration_number == request.registration_number)
        .first()
    )
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration number already exists",
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
        registration_number=request.registration_number,
        batch=request.batch,
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
        "user": _serialize_auth_user(user),
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _serialize_auth_user(current_user)

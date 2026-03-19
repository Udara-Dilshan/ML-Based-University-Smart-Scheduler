from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.academic import Batch, Department
from app.models.profiles import Lecturer, ResourceManager, Student
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.auth import hash_password
from app.utils.dependencies import require_admin_user

router = APIRouter(prefix="/api/users", tags=["users"])


def _validate_role(role: str) -> str:
    valid_roles = {item.value for item in UserRole}
    if role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role. Allowed roles: {sorted(valid_roles)}",
        )
    return role


def _parse_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_user_response(user: User) -> UserResponse:
    student_profile = None
    if user.student_profile:
        student_profile = {
            "reg_no": user.student_profile.index_number,
            "registration_number": user.student_profile.registration_number,
            "batch_id": _parse_int(user.student_profile.batch),
        }

    lecturer_profile = None
    if user.lecturer_profile:
        lecturer_profile = {
            "staff_id": user.lecturer_profile.employee_id,
            "dept_id": _parse_int(user.lecturer_profile.department),
            "designation": user.lecturer_profile.designation,
        }

    resource_manager_profile = None
    if user.resource_manager_profile:
        resource_manager_profile = {
            "assigned_section": user.resource_manager_profile.assigned_section,
        }

    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        contact_number=user.contact_number,
        profile_image=user.profile_image,
        student_profile=student_profile,
        lecturer_profile=lecturer_profile,
        resource_manager_profile=resource_manager_profile,
    )


def _set_student_profile(
    db: Session,
    user: User,
    reg_no: str,
    registration_number: Optional[str],
    batch_id: Optional[int],
):
    if batch_id is not None:
        batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

    duplicate_reg_no = (
        db.query(Student)
        .filter(Student.index_number == reg_no, Student.user_id != user.user_id)
        .first()
    )
    if duplicate_reg_no:
        raise HTTPException(status_code=409, detail="Student reg no already exists")

    if registration_number:
        duplicate_registration = (
            db.query(Student)
            .filter(
                Student.registration_number == registration_number,
                Student.user_id != user.user_id,
            )
            .first()
        )
        if duplicate_registration:
            raise HTTPException(status_code=409, detail="Registration number already exists")

    if not user.student_profile:
        user.student_profile = Student(user_id=user.user_id)

    user.student_profile.index_number = reg_no
    user.student_profile.registration_number = registration_number
    user.student_profile.batch = str(batch_id) if batch_id is not None else None


def _set_lecturer_profile(
    db: Session,
    user: User,
    staff_id: str,
    dept_id: Optional[int],
    designation: Optional[str],
):
    if dept_id is not None:
        department = db.query(Department).filter(Department.dept_id == dept_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")

    duplicate_staff_id = (
        db.query(Lecturer)
        .filter(Lecturer.employee_id == staff_id, Lecturer.user_id != user.user_id)
        .first()
    )
    if duplicate_staff_id:
        raise HTTPException(status_code=409, detail="Lecturer staff id already exists")

    if not user.lecturer_profile:
        user.lecturer_profile = Lecturer(user_id=user.user_id)

    user.lecturer_profile.employee_id = staff_id
    user.lecturer_profile.department = str(dept_id) if dept_id is not None else None
    user.lecturer_profile.designation = designation


def _set_resource_manager_profile(user: User, assigned_section: str):
    if not user.resource_manager_profile:
        user.resource_manager_profile = ResourceManager(user_id=user.user_id)
    user.resource_manager_profile.assigned_section = assigned_section


def _clear_non_target_profiles(user: User, role: str):
    if role != UserRole.STUDENT.value and user.student_profile:
        user.student_profile = None
    if role != UserRole.LECTURER.value and user.lecturer_profile:
        user.lecturer_profile = None
    if role != UserRole.RESOURCE_MANAGER.value and user.resource_manager_profile:
        user.resource_manager_profile = None


@router.get("/", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_user),
):
    users = db.query(User).order_by(User.user_id.desc()).all()
    return [_to_user_response(user) for user in users]


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_user),
):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    role = _validate_role(payload.role)
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=role,
        is_active=payload.is_active,
        contact_number=payload.contact_number,
        profile_image=payload.profile_image,
    )
    db.add(user)
    db.flush()

    if role == UserRole.STUDENT.value:
        if not payload.student_profile:
            raise HTTPException(status_code=422, detail="Student details are required")
        _set_student_profile(
            db=db,
            user=user,
            reg_no=payload.student_profile.reg_no.strip(),
            registration_number=(payload.student_profile.registration_number or "").strip()
            or None,
            batch_id=payload.student_profile.batch_id,
        )
    elif role == UserRole.LECTURER.value:
        if not payload.lecturer_profile:
            raise HTTPException(status_code=422, detail="Lecturer details are required")
        _set_lecturer_profile(
            db=db,
            user=user,
            staff_id=payload.lecturer_profile.staff_id.strip(),
            dept_id=payload.lecturer_profile.dept_id,
            designation=(payload.lecturer_profile.designation or "").strip() or None,
        )
    elif role == UserRole.RESOURCE_MANAGER.value:
        if not payload.resource_manager_profile:
            raise HTTPException(status_code=422, detail="Resource manager details are required")
        _set_resource_manager_profile(
            user=user,
            assigned_section=payload.resource_manager_profile.assigned_section.strip(),
        )

    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_user),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = payload.model_dump(exclude_unset=True)
    previous_role = user.role

    if "email" in data:
        duplicate_email = (
            db.query(User)
            .filter(User.email == data["email"], User.user_id != user_id)
            .first()
        )
        if duplicate_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )

    target_role = user.role
    if "role" in data:
        target_role = _validate_role(data["role"])
        data["role"] = target_role

    password = data.pop("password", None)
    if password:
        user.password_hash = hash_password(password)

    for key, value in data.items():
        if key in {"student_profile", "lecturer_profile", "resource_manager_profile"}:
            continue
        setattr(user, key, value)

    _clear_non_target_profiles(user, target_role)

    if target_role == UserRole.STUDENT.value:
        if payload.student_profile:
            _set_student_profile(
                db=db,
                user=user,
                reg_no=payload.student_profile.reg_no.strip(),
                registration_number=(payload.student_profile.registration_number or "").strip()
                or None,
                batch_id=payload.student_profile.batch_id,
            )
        elif user.student_profile is None and previous_role != target_role:
            raise HTTPException(status_code=422, detail="Student details are required")

    if target_role == UserRole.LECTURER.value:
        if payload.lecturer_profile:
            _set_lecturer_profile(
                db=db,
                user=user,
                staff_id=payload.lecturer_profile.staff_id.strip(),
                dept_id=payload.lecturer_profile.dept_id,
                designation=(payload.lecturer_profile.designation or "").strip() or None,
            )
        elif user.lecturer_profile is None and previous_role != target_role:
            raise HTTPException(status_code=422, detail="Lecturer details are required")

    if target_role == UserRole.RESOURCE_MANAGER.value:
        if payload.resource_manager_profile:
            _set_resource_manager_profile(
                user=user,
                assigned_section=payload.resource_manager_profile.assigned_section.strip(),
            )
        elif user.resource_manager_profile is None and previous_role != target_role:
            raise HTTPException(status_code=422, detail="Resource manager details are required")

    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_user),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()

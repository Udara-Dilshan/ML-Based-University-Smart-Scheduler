from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.academic import Batch, Department, Faculty
from app.models.profiles import Lecturer, ResourceManager, SchedulerProfile, Student
from app.models.user import User, UserRole
from app.utils.db_errors import commit_delete_or_raise
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.utils.auth import hash_password
from app.utils.dependencies import (
    get_scheduler_faculty_id,
    require_admin_or_scheduler,
    require_admin_user,
    _normalize_role,
)
import os
import uuid
from pathlib import Path

router = APIRouter(prefix="/api/users", tags=["users"])


APP_TO_DB_ROLE = {
    "SuperAdmin": "SUPER_ADMIN",
    "Scheduler": "SCHEDULER",
    "Lecturer": "LECTURER",
    "Student": "STUDENT",
    "ResourceManager": "RESOURCE_MANAGER",
}

DB_TO_APP_ROLE = {value: key for key, value in APP_TO_DB_ROLE.items()}

VALID_RESOURCE_MANAGER_SECTIONS = {"TRANSPORT", "EVENTS", "GENERAL"}


def _normalize_app_role(role: Optional[str]) -> Optional[str]:
    if role is None:
        return None
    raw = str(role).strip()
    if not raw:
        return None

    if raw in APP_TO_DB_ROLE:
        return raw

    upper = raw.upper()
    if upper in DB_TO_APP_ROLE:
        return DB_TO_APP_ROLE[upper]

    normalized = upper.replace(" ", "_")
    if normalized in DB_TO_APP_ROLE:
        return DB_TO_APP_ROLE[normalized]

    return None


def _to_db_role(role: str) -> str:
    return APP_TO_DB_ROLE[role]


def _normalize_resource_manager_section(value: str) -> str:
    normalized = (value or "").strip().upper().replace(" ", "_")
    if normalized not in VALID_RESOURCE_MANAGER_SECTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="assigned_section must be one of TRANSPORT, EVENTS, GENERAL",
        )
    return normalized


def _validate_role(role: str) -> str:
    normalized_role = _normalize_app_role(role)
    valid_roles = {item.value for item in UserRole}
    if normalized_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role. Allowed roles: {sorted(valid_roles)}",
        )
    return normalized_role


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
            "lecturer_id": user.lecturer_profile.id,
            "staff_id": user.lecturer_profile.employee_id,
            "dept_id": _parse_int(user.lecturer_profile.department),
            "designation": user.lecturer_profile.designation,
        }

    resource_manager_profile = None
    if user.resource_manager_profile:
        resource_manager_profile = {
            "assigned_section": user.resource_manager_profile.assigned_section,
        }

    scheduler_profile = None
    if user.scheduler_profile:
        faculty_name = None
        if user.scheduler_profile.faculty:
            faculty_name = user.scheduler_profile.faculty.name
        scheduler_profile = {
            "faculty_id": user.scheduler_profile.faculty_id,
            "faculty_name": faculty_name,
        }

    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=_normalize_app_role(user.role) or user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        contact_number=user.contact_number,
        profile_image=user.profile_image,
        student_profile=student_profile,
        lecturer_profile=lecturer_profile,
        resource_manager_profile=resource_manager_profile,
        scheduler_profile=scheduler_profile,
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
    user.resource_manager_profile.assigned_section = _normalize_resource_manager_section(assigned_section)


def _set_scheduler_profile(db: Session, user: User, faculty_id: int):
    faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    if not user.scheduler_profile:
        user.scheduler_profile = SchedulerProfile(user_id=user.user_id)
    user.scheduler_profile.faculty_id = faculty_id


def _clear_non_target_profiles(user: User, role: str):
    if role != UserRole.STUDENT.value and user.student_profile:
        user.student_profile = None
    if role != UserRole.LECTURER.value and user.lecturer_profile:
        user.lecturer_profile = None
    if role != UserRole.RESOURCE_MANAGER.value and user.resource_manager_profile:
        user.resource_manager_profile = None
    if role != UserRole.SCHEDULER.value and user.scheduler_profile:
        user.scheduler_profile = None


@router.get("/", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    role = _normalize_role(current_user.role)

    if role == UserRole.SUPER_ADMIN.value:
        # SuperAdmin sees everyone
        users = db.query(User).order_by(User.user_id.desc()).all()
    else:
        # Scheduler sees only Lecturers & Students in their faculty
        faculty_id = get_scheduler_faculty_id(current_user)

        # Get departments in this faculty
        dept_ids = [
            d.dept_id
            for d in db.query(Department).filter(Department.faculty_id == faculty_id).all()
        ]

        # Lecturers: those whose lecturer_profile.dept_id is in faculty departments
        lecturer_user_ids = set()
        if dept_ids:
            lecturers = (
                db.query(Lecturer)
                .filter(Lecturer.department.in_([str(d) for d in dept_ids]))
                .all()
            )
            lecturer_user_ids = {l.user_id for l in lecturers}

        # Students: those whose batch belongs to a degree in this faculty's departments
        from app.models.academic import Degree
        degree_ids = [
            deg.degree_id
            for deg in db.query(Degree).filter(Degree.dept_id.in_(dept_ids)).all()
        ] if dept_ids else []

        batch_ids_set = set()
        if degree_ids:
            batches = db.query(Batch).filter(Batch.degree_id.in_(degree_ids)).all()
            batch_ids_set = {str(b.batch_id) for b in batches}

        student_user_ids = set()
        if batch_ids_set:
            students = (
                db.query(Student)
                .filter(Student.batch.in_(batch_ids_set))
                .all()
            )
            student_user_ids = {s.user_id for s in students}

        allowed_user_ids = lecturer_user_ids | student_user_ids
        users = (
            db.query(User)
            .filter(User.user_id.in_(allowed_user_ids))
            .order_by(User.user_id.desc())
            .all()
        )

    return [_to_user_response(user) for user in users]


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    role = _normalize_role(current_user.role)

    # Schedulers can only create Lecturers and Students (not SuperAdmin, other Schedulers, ResourceManagers)
    if role == UserRole.SCHEDULER.value:
        target_role = _normalize_app_role(payload.role)
        if target_role not in {UserRole.LECTURER.value, UserRole.STUDENT.value}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Schedulers can only create Lecturer and Student accounts",
            )

    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    target_role = _validate_role(payload.role)
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=_to_db_role(target_role),
        is_active=payload.is_active,
        contact_number=payload.contact_number,
        profile_image=payload.profile_image,
    )
    db.add(user)
    db.flush()

    if target_role == UserRole.STUDENT.value:
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
    elif target_role == UserRole.LECTURER.value:
        if not payload.lecturer_profile:
            raise HTTPException(status_code=422, detail="Lecturer details are required")
        _set_lecturer_profile(
            db=db,
            user=user,
            staff_id=payload.lecturer_profile.staff_id.strip(),
            dept_id=payload.lecturer_profile.dept_id,
            designation=(payload.lecturer_profile.designation or "").strip() or None,
        )
    elif target_role == UserRole.RESOURCE_MANAGER.value:
        if not payload.resource_manager_profile:
            raise HTTPException(status_code=422, detail="Resource manager details are required")
        _set_resource_manager_profile(
            user=user,
            assigned_section=payload.resource_manager_profile.assigned_section.strip(),
        )
    elif target_role == UserRole.SCHEDULER.value:
        if not payload.scheduler_profile:
            raise HTTPException(status_code=422, detail="Scheduler faculty assignment is required")
        _set_scheduler_profile(
            db=db,
            user=user,
            faculty_id=payload.scheduler_profile.faculty_id,
        )

    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
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

    target_role = _normalize_app_role(user.role) or user.role
    if "role" in data:
        target_role = _validate_role(data["role"])
        data["role"] = _to_db_role(target_role)

    password = data.pop("password", None)
    if password:
        user.password_hash = hash_password(password)

    for key, value in data.items():
        if key in {"student_profile", "lecturer_profile", "resource_manager_profile", "scheduler_profile"}:
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

    if target_role == UserRole.SCHEDULER.value:
        if payload.scheduler_profile:
            _set_scheduler_profile(
                db=db,
                user=user,
                faculty_id=payload.scheduler_profile.faculty_id,
            )
        elif user.scheduler_profile is None and previous_role != target_role:
            raise HTTPException(status_code=422, detail="Scheduler faculty assignment is required")

    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Schedulers can only delete Lecturers/Students
    if _normalize_role(current_user.role) == UserRole.SCHEDULER.value:
        user_role = _normalize_role(user.role)
        if user_role not in {UserRole.LECTURER.value, UserRole.STUDENT.value}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Schedulers can only delete Lecturer and Student accounts",
            )

    db.delete(user)
    commit_delete_or_raise(db, "Cannot delete user because it is linked to other records.")


@router.post("/upload-image")
async def upload_user_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    """
    Upload a profile image for a user (admin/scheduler use).
    Image is saved to static/uploads and path is returned.
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

        # Return relative path
        relative_path = f"/static/uploads/{unique_filename}"

        return {
            "message": "Image uploaded successfully",
            "profile_image": relative_path,
        }

    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(err)}",
        )

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.academic import Batch, Degree, Department
from app.models.medical import MedicalSubmission, MedicalSubmissionStatus
from app.models.profiles import Student
from app.models.user import User, UserRole
from app.utils.dependencies import require_admin_user, require_admin_or_scheduler, get_scheduler_faculty_id, require_roles
from app.utils.notifications import create_notification, notify_role

router = APIRouter(prefix="/api/medical-submissions", tags=["medical-submissions"])


class MedicalSubmissionOut(BaseModel):
    submission_id: int
    student_user_id: int
    student_name: str
    reg_no: Optional[str] = None
    degree_name: Optional[str] = None
    batch_code: Optional[str] = None
    reason: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    document_path: str
    status: str
    admin_comment: Optional[str] = None
    created_at: Optional[datetime] = None


class MedicalSubmissionReview(BaseModel):
    status: str = Field(min_length=1)
    admin_comment: Optional[str] = None


class MedicalSubmissionSummary(BaseModel):
    pending_count: int


def _parse_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _get_student_batch(db: Session, current_user: User) -> Optional[Batch]:
    student_profile = current_user.student_profile
    if not student_profile:
        return None

    raw_batch_id = getattr(student_profile, "batch_id", None)
    if raw_batch_id is None:
        raw_batch_id = getattr(student_profile, "batch", None)

    batch_id = _parse_int(raw_batch_id)
    if not batch_id:
        return None

    return db.query(Batch).filter(Batch.batch_id == batch_id).first()


def _serialize_submission(item: MedicalSubmission) -> MedicalSubmissionOut:
    student_name = ""
    reg_no = None
    if item.student:
        student_name = f"{item.student.first_name} {item.student.last_name}".strip()
        if item.student.student_profile:
            reg_no = getattr(item.student.student_profile, "reg_no", None) or getattr(
                item.student.student_profile, "index_number", None
            )

    return MedicalSubmissionOut(
        submission_id=item.submission_id,
        student_user_id=item.student_user_id,
        student_name=student_name or "-",
        reg_no=reg_no,
        degree_name=item.degree.name if item.degree else None,
        batch_code=item.batch.batch_code if item.batch else None,
        reason=item.reason,
        start_date=item.start_date,
        end_date=item.end_date,
        description=item.description,
        document_path=item.document_path,
        status=item.status.value if hasattr(item.status, "value") else str(item.status),
        admin_comment=item.admin_comment,
        created_at=item.created_at,
    )


def _normalize_status(value: str) -> str:
    normalized = (value or "").strip().upper()
    if normalized not in {"PENDING", "APPROVED", "REJECTED"}:
        raise HTTPException(status_code=422, detail="Status must be Pending, Approved, or Rejected")
    return normalized


@router.get("/me", response_model=list[MedicalSubmissionOut])
def get_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT)),
):
    rows = (
        db.query(MedicalSubmission)
        .filter(MedicalSubmission.student_user_id == current_user.user_id)
        .order_by(MedicalSubmission.created_at.desc())
        .all()
    )
    return [_serialize_submission(item) for item in rows]


@router.get("/admin/summary", response_model=MedicalSubmissionSummary)
def get_admin_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(MedicalSubmission).filter(MedicalSubmission.status == MedicalSubmissionStatus.PENDING)
    
    if faculty_id is not None:
        query = query.join(Department, Department.dept_id == MedicalSubmission.dept_id).filter(Department.faculty_id == faculty_id)
        
    pending_count = query.count()
    return MedicalSubmissionSummary(pending_count=int(pending_count))


@router.get("/admin", response_model=list[MedicalSubmissionOut])
def get_admin_submissions(
    status: Optional[str] = None,
    degree_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(MedicalSubmission)

    if faculty_id is not None:
        query = query.join(Department, Department.dept_id == MedicalSubmission.dept_id).filter(Department.faculty_id == faculty_id)

    if status:
        query = query.filter(MedicalSubmission.status == _normalize_status(status))
    if degree_id:
        query = query.filter(MedicalSubmission.degree_id == degree_id)
    if batch_id:
        query = query.filter(MedicalSubmission.batch_id == batch_id)

    if search:
        token = f"%{search.strip()}%"
        query = (
            query.join(User, User.user_id == MedicalSubmission.student_user_id)
            .outerjoin(Student, Student.user_id == User.user_id)
            .filter(
                (User.first_name.ilike(token))
                | (User.last_name.ilike(token))
                | (User.email.ilike(token))
                | (Student.index_number.ilike(token))
            )
        )

    rows = query.order_by(MedicalSubmission.created_at.desc()).all()
    return [_serialize_submission(item) for item in rows]


@router.post("", response_model=MedicalSubmissionOut, status_code=status.HTTP_201_CREATED)
async def create_submission(
    reason: str = Form(..., description="Reason for leave"),
    start_date: str = Form(...),
    end_date: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT)),
    background_tasks: BackgroundTasks = None,
):
    if not reason.strip():
        raise HTTPException(status_code=422, detail="Reason is required")

    try:
        start_date_value = date.fromisoformat(start_date)
        end_date_value = date.fromisoformat(end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid date format") from exc

    if end_date_value < start_date_value:
        raise HTTPException(status_code=422, detail="End date must be after start date")

    allowed_types = {"image/jpeg", "image/png", "application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=422, detail="Only PDF, JPG, or PNG files are allowed")

    file_content = await file.read()
    max_size = 5 * 1024 * 1024
    if len(file_content) > max_size:
        raise HTTPException(status_code=422, detail="File size must be less than 5MB")

    uploads_dir = Path(__file__).parent.parent.parent / "static" / "uploads" / "medical"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = uploads_dir / unique_filename
    file_path.write_bytes(file_content)

    batch = _get_student_batch(db, current_user)
    degree = batch.degree if batch and batch.degree else None
    department = degree.department if degree and degree.department else None

    submission = MedicalSubmission(
        student_user_id=current_user.user_id,
        batch_id=batch.batch_id if batch else None,
        degree_id=degree.degree_id if degree else None,
        dept_id=department.dept_id if department else None,
        reason=reason.strip(),
        start_date=start_date_value,
        end_date=end_date_value,
        description=(description or "").strip() or None,
        document_path=f"/static/uploads/medical/{unique_filename}",
        document_type=file.content_type,
        document_size=len(file_content),
        status=MedicalSubmissionStatus.PENDING,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    if background_tasks:
        notify_role(background_tasks, get_db, db, "SUPER_ADMIN", "New Medical Submission", f"Student {current_user.first_name} submitted a medical document.", "MEDICAL_SUBMISSION", "MedicalSubmission", submission.submission_id)
        
        if department and department.faculty_id:
            from app.models.profiles import SchedulerProfile
            from app.utils.notifications import create_notification
            schedulers = db.query(SchedulerProfile.user_id).filter(SchedulerProfile.faculty_id == department.faculty_id).all()
            for (uid,) in schedulers:
                create_notification(background_tasks, get_db, uid, "New Medical Submission", f"Student {current_user.first_name} submitted a medical document.", "MEDICAL_SUBMISSION", "MedicalSubmission", submission.submission_id)

    return _serialize_submission(submission)


@router.put("/{submission_id}/review", response_model=MedicalSubmissionOut)
def review_submission(
    submission_id: int,
    payload: MedicalSubmissionReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
    background_tasks: BackgroundTasks = None,
):
    faculty_id = get_scheduler_faculty_id(current_user)
    query = db.query(MedicalSubmission).filter(MedicalSubmission.submission_id == submission_id)
    
    if faculty_id is not None:
        query = query.join(Department, Department.dept_id == MedicalSubmission.dept_id).filter(Department.faculty_id == faculty_id)
        
    submission = query.first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    normalized_status = _normalize_status(payload.status)

    submission.status = normalized_status
    submission.admin_comment = (payload.admin_comment or "").strip() or None
    submission.reviewed_by_user_id = current_user.user_id
    submission.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(submission)
    
    if background_tasks:
        create_notification(background_tasks, get_db, submission.student_user_id, f"Medical Submission {normalized_status.capitalize()}", f"Your medical submission from {submission.start_date} to {submission.end_date} was {normalized_status.lower()}.", "MEDICAL_SUBMISSION", "MedicalSubmission", submission.submission_id)

    return _serialize_submission(submission)

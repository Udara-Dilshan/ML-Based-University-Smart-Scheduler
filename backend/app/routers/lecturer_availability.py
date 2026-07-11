from datetime import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.connection import get_db
from ..models.lecturer_availability import LecturerAvailability
from ..models.profiles import Lecturer
from ..models.user import User, UserRole
from ..models.academic import Department, Faculty
from ..models.profiles import SchedulerProfile
from ..utils.dependencies import require_roles
from pydantic import BaseModel, Field

router = APIRouter(prefix="/availability", tags=["availability"])

class UnavailableSlotIn(BaseModel):
    day_of_week: str = Field(min_length=3, max_length=20)
    unavailable_start: time
    unavailable_end: time
    reason: str = Field(..., max_length=255)


class AvailabilitySyncIn(BaseModel):
    lecturer_id: int
    unavailable_slots: List[UnavailableSlotIn] = Field(default_factory=list)


class AvailabilitySlotOut(BaseModel):
    avail_id: int
    day_of_week: str
    start_time: str
    end_time: str
    reason: str
    status: str


class AvailabilitySyncOut(BaseModel):
    lecturer_id: int
    saved_count: int
    message: str


class StatusUpdateIn(BaseModel):
    status: str = Field(..., pattern="^(pending|approved|rejected)$")


class AdminAvailabilityRequestOut(BaseModel):
    avail_id: int
    lecturer_id: int
    lecturer_name: str
    department_id: Optional[int] = None
    department_code: Optional[str] = None
    faculty_id: Optional[int] = None
    day_of_week: str
    start_time: str
    end_time: str
    reason: str
    status: str


def _is_admin_user(user: User) -> bool:
    return str(user.role or "").strip() in {UserRole.SUPER_ADMIN.value, "SUPER_ADMIN"}


def _resolve_lecturer_reference(db: Session, reference_id: int) -> tuple[int, int]:
    lecturer_by_user = db.query(Lecturer).filter(Lecturer.user_id == reference_id).first()
    if lecturer_by_user:
        return lecturer_by_user.id, lecturer_by_user.user_id

    lecturer_by_pk = db.query(Lecturer).filter(Lecturer.id == reference_id).first()
    if lecturer_by_pk:
        return lecturer_by_pk.id, lecturer_by_pk.user_id

    raise HTTPException(status_code=404, detail="Lecturer profile not found")


@router.post("/sync", response_model=AvailabilitySyncOut)
def sync_lecturer_availability(
    payload: AvailabilitySyncIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.LECTURER, UserRole.SUPER_ADMIN)),
):
    lecturer_pk_id, lecturer_user_id = _resolve_lecturer_reference(db, payload.lecturer_id)

    if not _is_admin_user(current_user) and current_user.user_id != lecturer_user_id:
        raise HTTPException(status_code=403, detail="You can only update your own availability")

    existing_rows = db.query(LecturerAvailability).filter(
        LecturerAvailability.lecturer_id == lecturer_pk_id
    ).all()
    
    existing_map = {
        (row.day_of_week.upper(), row.unavailable_start, row.unavailable_end): row
        for row in existing_rows
    }

    seen_slots = set()

    for slot in payload.unavailable_slots:
        if slot.unavailable_end <= slot.unavailable_start:
            raise HTTPException(
                status_code=422,
                detail="unavailable_end must be later than unavailable_start",
            )
        
        key = (slot.day_of_week.strip().upper(), slot.unavailable_start, slot.unavailable_end)
        seen_slots.add(key)
        
        if key in existing_map:
            existing_map[key].reason = slot.reason.strip()
        else:
            db.add(
                LecturerAvailability(
                    lecturer_id=lecturer_pk_id,
                    day_of_week=key[0],
                    unavailable_start=slot.unavailable_start,
                    unavailable_end=slot.unavailable_end,
                    reason=slot.reason.strip(),
                    status="pending"
                )
            )

    for key, row in existing_map.items():
        if key not in seen_slots:
            db.delete(row)

    db.commit()

    return {
        "lecturer_id": lecturer_user_id,
        "saved_count": len(payload.unavailable_slots),
        "message": "Availability synced successfully",
    }


@router.get("/requests", response_model=List[AdminAvailabilityRequestOut])
def get_all_availability_requests(
    status: Optional[str] = None,
    lecturer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.SCHEDULER)),
):
    query = db.query(LecturerAvailability, Lecturer, User, Department, Faculty).join(
        Lecturer, LecturerAvailability.lecturer_id == Lecturer.id
    ).join(
        User, Lecturer.user_id == User.user_id
    ).outerjoin(
        Department, Lecturer.department == Department.dept_id
    ).outerjoin(
        Faculty, Department.faculty_id == Faculty.faculty_id
    )

    if not _is_admin_user(current_user):
        scheduler = db.query(SchedulerProfile).filter(SchedulerProfile.user_id == current_user.user_id).first()
        if not scheduler:
            raise HTTPException(status_code=403, detail="Scheduler profile not found")
        query = query.filter(Faculty.faculty_id == scheduler.faculty_id)

    if status:
        query = query.filter(LecturerAvailability.status == status.lower())
    if lecturer_id:
        query = query.filter(Lecturer.user_id == lecturer_id)

    rows = query.order_by(
        LecturerAvailability.status.desc(), 
        LecturerAvailability.day_of_week.asc(),
        LecturerAvailability.unavailable_start.asc()
    ).all()

    return [
        {
            "avail_id": row.LecturerAvailability.avail_id,
            "lecturer_id": row.Lecturer.user_id,
            "lecturer_name": f"{row.User.first_name} {row.User.last_name}",
            "department_id": row.Department.dept_id if row.Department else None,
            "department_code": row.Department.code if row.Department else None,
            "faculty_id": row.Faculty.faculty_id if row.Faculty else None,
            "day_of_week": row.LecturerAvailability.day_of_week,
            "start_time": row.LecturerAvailability.unavailable_start.strftime("%H:%M"),
            "end_time": row.LecturerAvailability.unavailable_end.strftime("%H:%M"),
            "reason": row.LecturerAvailability.reason,
            "status": row.LecturerAvailability.status,
        }
        for row in rows
    ]


@router.put("/requests/{avail_id}/status")
def update_availability_status(
    avail_id: int,
    payload: StatusUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    request = db.query(LecturerAvailability).filter(LecturerAvailability.avail_id == avail_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Availability request not found")
        
    request.status = payload.status.lower()
    db.commit()
    
    return {"message": f"Request status updated to {request.status}"}


@router.get("/{lecturer_id}", response_model=List[AvailabilitySlotOut])
def get_lecturer_availability(
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.LECTURER, UserRole.SUPER_ADMIN)),
):
    lecturer_pk_id, lecturer_user_id = _resolve_lecturer_reference(db, lecturer_id)

    if not _is_admin_user(current_user) and current_user.user_id != lecturer_user_id:
        raise HTTPException(status_code=403, detail="You can only view your own availability")

    rows = (
        db.query(LecturerAvailability)
        .filter(LecturerAvailability.lecturer_id == lecturer_pk_id)
        .order_by(LecturerAvailability.day_of_week.asc(), LecturerAvailability.unavailable_start.asc())
        .all()
    )

    return [
        {
            "avail_id": row.avail_id,
            "day_of_week": row.day_of_week,
            "start_time": row.unavailable_start.strftime("%H:%M"),
            "end_time": row.unavailable_end.strftime("%H:%M"),
            "reason": row.reason,
            "status": row.status,
        }
        for row in rows
    ]
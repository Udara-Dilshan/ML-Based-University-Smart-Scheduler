from datetime import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.lecturer_availability import LecturerAvailability
from ..models.profiles import Lecturer
from ..models.user import User, UserRole
from ..utils.dependencies import require_roles
from pydantic import BaseModel, Field

router = APIRouter(prefix="/availability", tags=["availability"])

class UnavailableSlotIn(BaseModel):
    day_of_week: str = Field(min_length=3, max_length=20)
    unavailable_start: time
    unavailable_end: time
    reason: Optional[str] = Field(default=None, max_length=255)


class AvailabilitySyncIn(BaseModel):
    lecturer_id: int
    unavailable_slots: List[UnavailableSlotIn] = Field(default_factory=list)


class AvailabilitySlotOut(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    reason: Optional[str] = None


class AvailabilitySyncOut(BaseModel):
    lecturer_id: int
    saved_count: int
    message: str


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
    )
    existing_rows.delete(synchronize_session=False)

    for slot in payload.unavailable_slots:
        if slot.unavailable_end <= slot.unavailable_start:
            raise HTTPException(
                status_code=422,
                detail="unavailable_end must be later than unavailable_start",
            )

        db.add(
            LecturerAvailability(
                lecturer_id=lecturer_pk_id,
                day_of_week=slot.day_of_week.strip().upper(),
                unavailable_start=slot.unavailable_start,
                unavailable_end=slot.unavailable_end,
                reason=(slot.reason or "").strip() or None,
            )
        )

    db.commit()

    return {
        "lecturer_id": lecturer_user_id,
        "saved_count": len(payload.unavailable_slots),
        "message": "Availability synced successfully",
    }


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
            "day_of_week": row.day_of_week,
            "start_time": row.unavailable_start.strftime("%H:%M"),
            "end_time": row.unavailable_end.strftime("%H:%M"),
            "reason": row.reason,
        }
        for row in rows
    ]


class AvailabilityOut(BaseModel):
    lecturer_id: int
    day_of_week: str
    unavailable_start: str
    unavailable_end: str
    reason: Optional[str] = None
    avail_id: int

    class Config:
        from_attributes = True
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.academic import Module
from ..models.resource import Resource
from ..models.timetable import TimetableSession
from ..models.user import User, UserRole
from ..utils.dependencies import require_admin_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_MAP = {
    "mon": "Mon",
    "monday": "Mon",
    "tue": "Tue",
    "tues": "Tue",
    "tuesday": "Tue",
    "wed": "Wed",
    "wednesday": "Wed",
    "thu": "Thu",
    "thur": "Thu",
    "thurs": "Thu",
    "thursday": "Thu",
    "fri": "Fri",
    "friday": "Fri",
    "sat": "Sat",
    "saturday": "Sat",
    "sun": "Sun",
    "sunday": "Sun",
}


def normalize_day(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    token = value.strip().lower()
    if token in DAY_MAP:
        return DAY_MAP[token]
    return DAY_MAP.get(token[:3])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_user),
):
    total_students = (
        db.query(func.count(User.user_id))
        .filter(User.role == UserRole.STUDENT.value)
        .scalar()
        or 0
    )
    active_courses = db.query(func.count(Module.module_id)).scalar() or 0
    total_lecturers = (
        db.query(func.count(User.user_id))
        .filter(User.role == UserRole.LECTURER.value)
        .scalar()
        or 0
    )
    total_resources = db.query(func.count(Resource.resource_id)).scalar() or 0
    scheduled_resources = (
        db.query(func.count(distinct(TimetableSession.resource_id))).scalar() or 0
    )
    resource_usage_percent = (
        round((scheduled_resources / total_resources) * 100, 1) if total_resources else 0
    )

    sessions_by_day = {day: 0 for day in DAY_ORDER}
    resources_by_day = {day: 0 for day in DAY_ORDER}

    session_rows = (
        db.query(
            TimetableSession.day_of_week,
            func.count(TimetableSession.session_id),
        )
        .group_by(TimetableSession.day_of_week)
        .all()
    )
    for day_value, count in session_rows:
        day = normalize_day(day_value)
        if day:
            sessions_by_day[day] = int(count)

    resource_rows = (
        db.query(
            TimetableSession.day_of_week,
            func.count(distinct(TimetableSession.resource_id)),
        )
        .group_by(TimetableSession.day_of_week)
        .all()
    )
    for day_value, count in resource_rows:
        day = normalize_day(day_value)
        if day:
            resources_by_day[day] = int(count)

    weekly_activity = [
        {
            "name": day,
            "sessions": sessions_by_day[day],
            "resources": resources_by_day[day],
        }
        for day in DAY_ORDER
    ]

    type_rows = (
        db.query(Resource.type, func.count(Resource.resource_id))
        .group_by(Resource.type)
        .all()
    )
    total_types = sum(int(count) for _, count in type_rows)
    resource_usage = [
        {
            "name": resource_type or "Other",
            "value": int(count),
            "percentage": round((int(count) / total_types) * 100, 1) if total_types else 0,
        }
        for resource_type, count in type_rows
    ]

    return {
        "cards": {
            "total_students": total_students,
            "active_courses": active_courses,
            "total_lecturers": total_lecturers,
            "resource_usage_percent": resource_usage_percent,
        },
        "weekly_activity": weekly_activity,
        "resource_usage": resource_usage,
    }

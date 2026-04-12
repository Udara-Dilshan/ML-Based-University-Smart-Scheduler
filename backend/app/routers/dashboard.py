from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.academic import Batch, LecturerModuleAssignment, Module
from ..models.resource import Resource
from ..models.settings import SystemConstraint
from ..models.timetable import TimetableSession
from ..models.user import User, UserRole
from ..utils.dependencies import require_admin_user, require_roles

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_FULL_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
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

WORKING_HOURS_START_KEY = "working_hours_start"
WORKING_HOURS_END_KEY = "working_hours_end"
WORKING_DAYS_MASK_KEY = "working_days_mask"


def normalize_day(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    token = value.strip().lower()
    if token in DAY_MAP:
        return DAY_MAP[token]
    return DAY_MAP.get(token[:3])


def _time_to_minutes(value: Optional[str]) -> int:
    if not value:
        return 0
    token = value.strip()
    try:
        hour_token, minute_token = token.split(":", maxsplit=1)
        hour = int(hour_token)
        minute = int(minute_token)
        return (hour * 60) + minute
    except (ValueError, AttributeError):
        return 0


def _minutes_to_hhmm(value: int) -> str:
    safe_minutes = max(0, int(value or 0))
    hours = safe_minutes // 60
    minutes = safe_minutes % 60
    return f"{hours:02d}:{minutes:02d}"


def _decode_working_days(mask: int) -> list[str]:
    days = []
    for index, day in enumerate(DAY_FULL_ORDER):
        if (int(mask or 0) & (1 << index)) != 0:
            days.append(day)
    return days


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


@router.get("/lecturer-summary")
def get_lecturer_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.LECTURER)),
):
    lecturer_id = current_user.user_id

    assignment_rows = (
        db.query(LecturerModuleAssignment)
        .filter(
            LecturerModuleAssignment.lecturer_user_id == lecturer_id,
            LecturerModuleAssignment.is_active.is_(True),
        )
        .all()
    )

    my_courses = len(assignment_rows)
    batch_ids = sorted({item.batch_id for item in assignment_rows})

    total_students = 0
    if batch_ids:
        total_students = (
            db.query(func.coalesce(func.sum(Batch.student_count), 0))
            .filter(Batch.batch_id.in_(batch_ids))
            .scalar()
            or 0
        )

    assigned_hours = 0
    if assignment_rows:
        assigned_hours = (
            db.query(func.coalesce(func.sum(Module.lecture_hours_per_week), 0))
            .join(LecturerModuleAssignment, LecturerModuleAssignment.module_id == Module.module_id)
            .filter(
                LecturerModuleAssignment.lecturer_user_id == lecturer_id,
                LecturerModuleAssignment.is_active.is_(True),
            )
            .scalar()
            or 0
        )

    timetable_rows = (
        db.query(TimetableSession, Module, Batch, Resource)
        .join(Module, Module.module_id == TimetableSession.module_id)
        .join(Batch, Batch.batch_id == TimetableSession.batch_id)
        .join(Resource, Resource.resource_id == TimetableSession.resource_id)
        .filter(TimetableSession.lecturer_id == lecturer_id)
        .all()
    )

    today_name = DAY_ORDER[datetime.now().weekday()]
    today_schedule = []
    today_classes = 0
    total_timetable_minutes = 0

    for session, module, batch, resource in timetable_rows:
        start_minutes = _time_to_minutes(session.start_time)
        end_minutes = _time_to_minutes(session.end_time)
        duration = max(0, end_minutes - start_minutes)
        total_timetable_minutes += duration

        day_name = normalize_day(session.day_of_week)
        if day_name != today_name:
            continue

        today_classes += 1
        today_schedule.append(
            {
                "time": f"{session.start_time} - {session.end_time}",
                "start_time": session.start_time,
                "course": module.name,
                "room": resource.name,
                "batch": batch.batch_code,
            }
        )

    today_schedule.sort(key=lambda item: _time_to_minutes(item.get("start_time")))
    today_schedule = [
        {
            "time": item["time"],
            "course": item["course"],
            "room": item["room"],
            "batch": item["batch"],
        }
        for item in today_schedule
    ]

    timetable_hours = round(total_timetable_minutes / 60, 1)
    hours_this_week = timetable_hours if timetable_hours > 0 else assigned_hours

    return {
        "cards": {
            "today_classes": today_classes,
            "total_students": int(total_students),
            "my_courses": my_courses,
            "hours_this_week": hours_this_week,
        },
        "today_schedule": today_schedule,
    }


@router.get("/lecturer-courses")
def get_lecturer_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.LECTURER)),
):
    lecturer_id = current_user.user_id

    assignments = (
        db.query(LecturerModuleAssignment, Module, Batch)
        .join(Module, Module.module_id == LecturerModuleAssignment.module_id)
        .join(Batch, Batch.batch_id == LecturerModuleAssignment.batch_id)
        .filter(
            LecturerModuleAssignment.lecturer_user_id == lecturer_id,
            LecturerModuleAssignment.is_active.is_(True),
        )
        .order_by(Batch.batch_code.asc(), Module.code.asc())
        .all()
    )

    courses = []
    total_students = 0
    total_hours = 0

    for assignment, module, batch in assignments:
        total_students += int(batch.student_count or 0)
        total_hours += int(module.lecture_hours_per_week or 0)
        courses.append(
            {
                "assignment_id": assignment.id,
                "module_id": module.module_id,
                "module_code": module.code,
                "module_name": module.name,
                "batch_id": batch.batch_id,
                "batch_code": batch.batch_code,
                "students": int(batch.student_count or 0),
                "hours_per_week": int(module.lecture_hours_per_week or 0),
            }
        )

    return {
        "cards": {
            "total_courses": len(courses),
            "total_students": total_students,
            "weekly_hours": total_hours,
        },
        "courses": courses,
    }


@router.get("/lecturer-working-constraints")
def get_lecturer_working_constraints(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.LECTURER, UserRole.SUPER_ADMIN)),
):
    rows = db.query(SystemConstraint).filter(SystemConstraint.batch_id.is_(None)).all()
    by_name = {row.name: row.value for row in rows}

    start_minutes = int(by_name.get(WORKING_HOURS_START_KEY, 480))
    end_minutes = int(by_name.get(WORKING_HOURS_END_KEY, 1020))
    days_mask = int(by_name.get(WORKING_DAYS_MASK_KEY, 31))

    working_days = _decode_working_days(days_mask)
    if not working_days:
        working_days = DAY_FULL_ORDER[:5]

    return {
        "working_hours_start": _minutes_to_hhmm(start_minutes),
        "working_hours_end": _minutes_to_hhmm(end_minutes),
        "working_days": working_days,
    }

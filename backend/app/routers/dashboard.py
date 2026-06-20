from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..models.academic import Batch, BatchActiveTerm, DegreeSemesterModule, LecturerModuleAssignment, Module
from ..models.resource import Resource
from ..models.settings import SystemConstraint
from ..models.timetable import TimetableSession
from ..models.user import User, UserRole
from ..utils.dependencies import require_admin_user, require_roles, require_admin_or_scheduler, get_scheduler_faculty_id

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


def _semester_label(semester_number: int) -> str:
    year = ((semester_number - 1) // 2) + 1
    semester = 1 if semester_number % 2 == 1 else 2
    return f"Year {year} Semester {semester}"


SEMESTER_NAME_TO_NUMBER = {
    _semester_label(number): number
    for number in range(1, 11)
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


from typing import Any

def _time_to_minutes(value: Any) -> int:
    if not value:
        return 0
    from datetime import time
    if isinstance(value, time):
        return (value.hour * 60) + value.minute
    token = str(value).strip()
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


@router.get("/scheduler-stats")
def get_scheduler_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_scheduler),
):
    """Faculty-scoped dashboard stats for Scheduler. SuperAdmin sees all."""
    from ..models.academic import Department, Degree
    from ..models.profiles import Lecturer as LecturerProfile, Student as StudentProfile

    faculty_id = get_scheduler_faculty_id(current_user)

    # Get scoped dept/degree/batch IDs
    if faculty_id is not None:
        dept_ids = [d.dept_id for d in db.query(Department).filter(Department.faculty_id == faculty_id).all()]
        degree_ids = [deg.degree_id for deg in db.query(Degree).filter(Degree.dept_id.in_(dept_ids)).all()] if dept_ids else []
        batch_ids_for_query = [b.batch_id for b in db.query(Batch).filter(Batch.degree_id.in_(degree_ids)).all()] if degree_ids else []

        # Students in faculty
        student_batch_ids_str = {str(bid) for bid in batch_ids_for_query}
        total_students = (
            db.query(func.count(StudentProfile.id))
            .filter(StudentProfile.batch.in_(student_batch_ids_str))
            .scalar() or 0
        ) if student_batch_ids_str else 0

        # Lecturers in faculty
        lecturer_user_ids = [
            lp.user_id for lp in db.query(LecturerProfile).filter(
                LecturerProfile.department.in_([str(d) for d in dept_ids])
            ).all()
        ] if dept_ids else []
        total_lecturers = len(lecturer_user_ids)

        # Courses (modules) in faculty
        active_courses = (
            db.query(func.count(Module.module_id))
            .filter(Module.dept_id.in_(dept_ids))
            .scalar() or 0
        ) if dept_ids else 0

        # Resources in faculty
        total_resources = (
            db.query(func.count(Resource.resource_id))
            .filter(Resource.faculty_id == faculty_id)
            .scalar() or 0
        )

        # Timetable sessions in faculty (via batch)
        scheduled_resources = (
            db.query(func.count(distinct(TimetableSession.resource_id)))
            .filter(TimetableSession.batch_id.in_(batch_ids_for_query))
            .scalar() or 0
        ) if batch_ids_for_query else 0

        sessions_by_day = {day: 0 for day in DAY_ORDER}
        resources_by_day = {day: 0 for day in DAY_ORDER}

        if batch_ids_for_query:
            session_rows = (
                db.query(TimetableSession.day_of_week, func.count(TimetableSession.session_id))
                .filter(TimetableSession.batch_id.in_(batch_ids_for_query))
                .group_by(TimetableSession.day_of_week)
                .all()
            )
            for day_value, count in session_rows:
                day = normalize_day(day_value)
                if day:
                    sessions_by_day[day] = int(count)

            resource_rows = (
                db.query(TimetableSession.day_of_week, func.count(distinct(TimetableSession.resource_id)))
                .filter(TimetableSession.batch_id.in_(batch_ids_for_query))
                .group_by(TimetableSession.day_of_week)
                .all()
            )
            for day_value, count in resource_rows:
                day = normalize_day(day_value)
                if day:
                    resources_by_day[day] = int(count)

        type_rows = (
            db.query(Resource.type, func.count(Resource.resource_id))
            .filter(Resource.faculty_id == faculty_id)
            .group_by(Resource.type)
            .all()
        )
    else:
        # SuperAdmin: return same as global stats
        total_students = db.query(func.count(User.user_id)).filter(User.role == UserRole.STUDENT.value).scalar() or 0
        total_lecturers = db.query(func.count(User.user_id)).filter(User.role == UserRole.LECTURER.value).scalar() or 0
        active_courses = db.query(func.count(Module.module_id)).scalar() or 0
        total_resources = db.query(func.count(Resource.resource_id)).scalar() or 0
        scheduled_resources = db.query(func.count(distinct(TimetableSession.resource_id))).scalar() or 0
        sessions_by_day = {day: 0 for day in DAY_ORDER}
        resources_by_day = {day: 0 for day in DAY_ORDER}
        for day_value, count in db.query(TimetableSession.day_of_week, func.count(TimetableSession.session_id)).group_by(TimetableSession.day_of_week).all():
            day = normalize_day(day_value)
            if day:
                sessions_by_day[day] = int(count)
        for day_value, count in db.query(TimetableSession.day_of_week, func.count(distinct(TimetableSession.resource_id))).group_by(TimetableSession.day_of_week).all():
            day = normalize_day(day_value)
            if day:
                resources_by_day[day] = int(count)
        type_rows = db.query(Resource.type, func.count(Resource.resource_id)).group_by(Resource.type).all()

    resource_usage_percent = round((scheduled_resources / total_resources) * 100, 1) if total_resources else 0
    weekly_activity = [{"name": day, "sessions": sessions_by_day[day], "resources": resources_by_day[day]} for day in DAY_ORDER]
    total_types = sum(int(count) for _, count in type_rows)
    resource_usage = [
        {"name": rt or "Other", "value": int(count), "percentage": round((int(count) / total_types) * 100, 1) if total_types else 0}
        for rt, count in type_rows
    ]

    faculty_name = None
    if faculty_id is not None and current_user.scheduler_profile:
        faculty_name = current_user.scheduler_profile.faculty.name if current_user.scheduler_profile.faculty else None

    return {
        "faculty_id": faculty_id,
        "faculty_name": faculty_name,
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
    lecturer_profile_id = current_user.lecturer_profile.id if current_user.lecturer_profile else None

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

    timetable_rows = []
    if lecturer_profile_id:
        timetable_rows = (
            db.query(TimetableSession, Module, Batch, Resource)
            .join(Module, Module.module_id == TimetableSession.module_id)
            .join(Batch, Batch.batch_id == TimetableSession.batch_id)
            .join(Resource, Resource.resource_id == TimetableSession.resource_id)
            .filter(TimetableSession.lecturer_id == lecturer_profile_id)
            .all()
        )

    today_name = DAY_ORDER[datetime.now().weekday()]
    today_schedule = []
    today_classes = 0
    total_timetable_minutes = 0
    now_minutes = datetime.now().hour * 60 + datetime.now().minute

    for session, module, batch, resource in timetable_rows:
        start_minutes = _time_to_minutes(session.start_time)
        end_minutes = _time_to_minutes(session.end_time)
        duration = max(0, end_minutes - start_minutes)
        total_timetable_minutes += duration

        day_name = normalize_day(session.day_of_week)
        if day_name != today_name:
            continue

        if now_minutes < start_minutes:
            status = "Upcoming"
        elif now_minutes <= end_minutes:
            status = "Ongoing"
        else:
            status = "Done"

        today_classes += 1
        start_str = str(session.start_time)[:5]
        end_str = str(session.end_time)[:5]
        today_schedule.append(
            {
                "time": f"{start_str} - {end_str}",
                "start_time": start_minutes,
                "start_time_str": start_str,
                "end_time_str": end_str,
                "course": module.name,
                "module_code": module.code,
                "room": resource.name,
                "batch": batch.batch_code,
                "status": status,
            }
        )

    today_schedule.sort(key=lambda item: item.get("start_time", 0))
    today_schedule = [
        {
            "time": item["time"],
            "start_time_str": item["start_time_str"],
            "end_time_str": item["end_time_str"],
            "course": item["course"],
            "module_code": item["module_code"],
            "room": item["room"],
            "batch": item["batch"],
            "status": item["status"],
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


@router.get("/student-courses")
def get_student_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT)),
):
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    raw_batch_id = getattr(student_profile, "batch_id", None)
    if raw_batch_id is None:
        raw_batch_id = getattr(student_profile, "batch", None)

    try:
        batch_id = int(str(raw_batch_id).strip()) if raw_batch_id is not None else None
    except (TypeError, ValueError):
        batch_id = None

    if not batch_id:
        raise HTTPException(status_code=422, detail="Student batch is not set")

    batch = db.query(Batch).filter(Batch.batch_id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if not batch.degree:
        raise HTTPException(status_code=404, detail="Degree not found for student batch")

    semester_number, semester_name = _resolve_batch_semester(batch, db)

    modules = (
        db.query(Module)
        .join(DegreeSemesterModule, DegreeSemesterModule.module_id == Module.module_id)
        .filter(
            DegreeSemesterModule.degree_id == batch.degree_id,
            DegreeSemesterModule.semester_number == semester_number,
        )
        .order_by(Module.name.asc())
        .all()
    )

    module_ids = [module.module_id for module in modules]
    assignments = []
    if module_ids:
        assignments = (
            db.query(LecturerModuleAssignment)
            .filter(
                LecturerModuleAssignment.batch_id == batch.batch_id,
                LecturerModuleAssignment.module_id.in_(module_ids),
                LecturerModuleAssignment.is_active.is_(True),
            )
            .all()
        )

    assignment_by_module_id = {item.module_id: item for item in assignments}
    lecturer_ids = [item.lecturer_user_id for item in assignments]
    lecturer_by_id = {}
    if lecturer_ids:
        lecturer_rows = db.query(User).filter(User.user_id.in_(lecturer_ids)).all()
        lecturer_by_id = {item.user_id: item for item in lecturer_rows}

    total_credits = sum(int(module.credits or 0) for module in modules)

    return {
        "batch_id": batch.batch_id,
        "batch_code": batch.batch_code,
        "degree_id": batch.degree_id,
        "degree_name": batch.degree.name,
        "semester_name": semester_name,
        "semester_number": semester_number,
        "total_courses": len(modules),
        "total_credits": total_credits,
        "modules": [
            {
                "module_id": module.module_id,
                "code": module.code,
                "name": module.name,
                "credits": module.credits,
                "department_name": module.department.name if module.department else None,
                "lecture_hours_per_week": module.lecture_hours_per_week,
                "status": "Active" if int(module.is_active or 0) == 1 else "Inactive",
                "assigned_lecturer_user_id": assignment_by_module_id[module.module_id].lecturer_user_id
                if module.module_id in assignment_by_module_id
                else None,
                "assigned_lecturer_name": (
                    f"{lecturer_by_id[assignment_by_module_id[module.module_id].lecturer_user_id].first_name} "
                    f"{lecturer_by_id[assignment_by_module_id[module.module_id].lecturer_user_id].last_name}"
                ).strip()
                if module.module_id in assignment_by_module_id
                and assignment_by_module_id[module.module_id].lecturer_user_id in lecturer_by_id
                else None,
            }
            for module in modules
        ],
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


@router.get("/student-summary")
def get_student_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT)),
):
    student_profile = current_user.student_profile
    raw_batch_id = getattr(student_profile, "batch_id", None) if student_profile else None
    if raw_batch_id is None and student_profile:
        raw_batch_id = getattr(student_profile, "batch", None)

    try:
        batch_id = int(str(raw_batch_id).strip()) if raw_batch_id is not None else None
    except (TypeError, ValueError):
        batch_id = None

    today_name = DAY_FULL_ORDER[datetime.now().weekday()]
    today_sessions = []
    total_modules = 0
    now_minutes = datetime.now().hour * 60 + datetime.now().minute

    if batch_id:
        from ..models.profiles import Lecturer as LecturerProfile

        rows = (
            db.query(TimetableSession, Module, Resource)
            .join(Module, Module.module_id == TimetableSession.module_id)
            .join(Resource, Resource.resource_id == TimetableSession.resource_id)
            .filter(
                TimetableSession.batch_id == batch_id,
                TimetableSession.status == "PUBLISHED",
                func.upper(TimetableSession.day_of_week) == today_name.upper(),
            )
            .order_by(TimetableSession.start_time)
            .all()
        )

        for session, module, resource in rows:
            start_min = _time_to_minutes(session.start_time)
            end_min = _time_to_minutes(session.end_time)

            if now_minutes < start_min:
                status = "Upcoming"
            elif now_minutes <= end_min:
                status = "Ongoing"
            else:
                status = "Done"

            # fetch lecturer name
            lecturer_name = None
            lecturer_row = (
                db.query(LecturerProfile)
                .filter(LecturerProfile.id == session.lecturer_id)
                .first()
            )
            if lecturer_row:
                lecturer_user = db.query(User).filter(User.user_id == lecturer_row.user_id).first()
                if lecturer_user:
                    lecturer_name = f"{lecturer_user.first_name} {lecturer_user.last_name}".strip()

            today_sessions.append({
                "session_id": session.session_id,
                "module_name": module.name,
                "module_code": module.code,
                "room_name": resource.name,
                "start_time": str(session.start_time)[:5],
                "end_time": str(session.end_time)[:5],
                "status": status,
                "lecturer_name": lecturer_name,
            })

        total_modules = (
            db.query(func.count(DegreeSemesterModule.id))
            .join(Batch, Batch.degree_id == DegreeSemesterModule.degree_id)
            .filter(Batch.batch_id == batch_id)
            .scalar()
            or 0
        )

    return {
        "today_sessions": today_sessions,
        "total_modules": total_modules,
    }

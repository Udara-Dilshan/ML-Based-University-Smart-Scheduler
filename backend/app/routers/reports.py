"""
Reports & Analytics Router
===========================
Comprehensive reporting endpoints for Admin / Scheduler dashboards.

Covers:
  - Overview summary (users, courses, resources, requests, medical)
  - User breakdown by role
  - Academic stats (faculties, departments, degrees, batches, modules)
  - Resource utilisation (type distribution, usage %)
  - Request analytics (event + vehicle: pending/approved/rejected)
  - Medical submission analytics
  - Timetable sessions per day
  - Recent activity feed
"""
from __future__ import annotations

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.academic import (
    Batch, Degree, Department, Faculty, LecturerModuleAssignment, Module,
)
from ..models.event import Event, EventRequest, RequestStatus, VehicleRequest
from ..models.medical import MedicalSubmission, MedicalSubmissionStatus
from ..models.resource import Resource
from ..models.timetable import TimetableSession
from ..models.user import User, UserRole
from ..utils.dependencies import require_admin_user, require_admin_scheduler_or_manager

router = APIRouter(prefix="/api/reports", tags=["reports"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_FULL_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_MAP: dict[str, str] = {
    "mon": "Mon", "monday": "Mon",
    "tue": "Tue", "tues": "Tue", "tuesday": "Tue",
    "wed": "Wed", "wednesday": "Wed",
    "thu": "Thu", "thur": "Thu", "thurs": "Thu", "thursday": "Thu",
    "fri": "Fri", "friday": "Fri",
    "sat": "Sat", "saturday": "Sat",
    "sun": "Sun", "sunday": "Sun",
}


def _norm_day(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    tok = value.strip().lower()
    return DAY_MAP.get(tok) or DAY_MAP.get(tok[:3])


# ---------------------------------------------------------------------------
# GET /api/reports/overview
# ---------------------------------------------------------------------------

@router.get("/overview")
def get_reports_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_scheduler_or_manager),
):
    """Top-level KPI cards for the Reports page."""
    q_users = db.query(User)
    q_ev_reqs = db.query(EventRequest)
    q_veh_reqs = db.query(VehicleRequest)
    q_events = db.query(Event)
    q_medical = db.query(MedicalSubmission)

    if start_date:
        q_users = q_users.filter(User.created_at >= start_date)
        q_ev_reqs = q_ev_reqs.filter(EventRequest.event_date >= start_date)
        q_veh_reqs = q_veh_reqs.filter(VehicleRequest.trip_date >= start_date)
        q_events = q_events.filter(Event.event_date >= start_date)
        q_medical = q_medical.filter(MedicalSubmission.start_date >= start_date)
    if end_date:
        q_users = q_users.filter(User.created_at <= f"{end_date} 23:59:59")
        q_ev_reqs = q_ev_reqs.filter(EventRequest.event_date <= end_date)
        q_veh_reqs = q_veh_reqs.filter(VehicleRequest.trip_date <= end_date)
        q_events = q_events.filter(Event.event_date <= end_date)
        q_medical = q_medical.filter(MedicalSubmission.start_date <= end_date)

    total_students = q_users.filter(User.role == "STUDENT").count()
    total_lecturers = q_users.filter(User.role == "LECTURER").count()
    total_schedulers = q_users.filter(User.role == "SCHEDULER").count()
    total_resource_managers = q_users.filter(User.role == "RESOURCE_MANAGER").count()
    total_admins = q_users.filter(User.role == "SUPER_ADMIN").count()
    total_users = total_students + total_lecturers + total_schedulers + total_resource_managers + total_admins

    # Unfiltered structural data
    total_faculties = db.query(func.count(Faculty.faculty_id)).scalar() or 0
    total_departments = db.query(func.count(Department.dept_id)).scalar() or 0
    total_degrees = db.query(func.count(Degree.degree_id)).scalar() or 0
    total_batches = db.query(func.count(Batch.batch_id)).scalar() or 0
    total_modules = db.query(func.count(Module.module_id)).scalar() or 0
    total_resources = db.query(func.count(Resource.resource_id)).scalar() or 0
    active_resources = db.query(func.count(Resource.resource_id)).filter(Resource.is_active.is_(True)).scalar() or 0

    pending_event_reqs = q_ev_reqs.filter(EventRequest.status == RequestStatus.PENDING).count()
    pending_vehicle_reqs = q_veh_reqs.filter(VehicleRequest.status == RequestStatus.PENDING).count()
    total_events = q_events.count()

    pending_medical = q_medical.filter(MedicalSubmission.status == MedicalSubmissionStatus.PENDING).count()
    total_medical = q_medical.count()

    total_sessions = db.query(func.count(TimetableSession.session_id)).scalar() or 0
    published_sessions = db.query(func.count(TimetableSession.session_id)).filter(TimetableSession.status == "PUBLISHED").scalar() or 0

    return {
        "users": {
            "total": total_users,
            "students": total_students,
            "lecturers": total_lecturers,
            "schedulers": total_schedulers,
            "resource_managers": total_resource_managers,
            "admins": total_admins,
        },
        "academic": {
            "faculties": total_faculties,
            "departments": total_departments,
            "degrees": total_degrees,
            "batches": total_batches,
            "modules": total_modules,
        },
        "resources": {
            "total": total_resources,
            "active": active_resources,
            "inactive": total_resources - active_resources,
        },
        "requests": {
            "pending_events": pending_event_reqs,
            "pending_vehicles": pending_vehicle_reqs,
            "total_events": total_events,
        },
        "medical": {
            "pending": pending_medical,
            "total": total_medical,
        },
        "timetable": {
            "total_sessions": total_sessions,
            "published_sessions": published_sessions,
        },
    }


# ---------------------------------------------------------------------------
# GET /api/reports/users
# ---------------------------------------------------------------------------

@router.get("/users")
def get_user_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_scheduler_or_manager),
):
    """Users breakdown: role pie chart + active/inactive."""
    q_roles = db.query(User.role, func.count(User.user_id))
    q_active = db.query(func.count(User.user_id)).filter(User.is_active.is_(True))
    q_inactive = db.query(func.count(User.user_id)).filter(User.is_active.is_(False))

    if start_date:
        q_roles = q_roles.filter(User.created_at >= start_date)
        q_active = q_active.filter(User.created_at >= start_date)
        q_inactive = q_inactive.filter(User.created_at >= start_date)
    if end_date:
        q_roles = q_roles.filter(User.created_at <= f"{end_date} 23:59:59")
        q_active = q_active.filter(User.created_at <= f"{end_date} 23:59:59")
        q_inactive = q_inactive.filter(User.created_at <= f"{end_date} 23:59:59")

    role_rows = q_roles.group_by(User.role).all()
    role_map = {r: c for r, c in role_rows}

    active_total = q_active.scalar() or 0
    inactive_total = q_inactive.scalar() or 0
    total = active_total + inactive_total

    roles = [
        {"name": "Students",          "role": "STUDENT",           "count": role_map.get("STUDENT", 0)},
        {"name": "Lecturers",         "role": "LECTURER",          "count": role_map.get("LECTURER", 0)},
        {"name": "Schedulers",        "role": "SCHEDULER",         "count": role_map.get("SCHEDULER", 0)},
        {"name": "Resource Managers", "role": "RESOURCE_MANAGER",  "count": role_map.get("RESOURCE_MANAGER", 0)},
        {"name": "Admins",            "role": "SUPER_ADMIN",       "count": role_map.get("SUPER_ADMIN", 0)},
    ]
    for r in roles:
        r["percentage"] = round((r["count"] / total) * 100, 1) if total else 0

    return {
        "total": total,
        "active": active_total,
        "inactive": inactive_total,
        "by_role": roles,
    }


# ---------------------------------------------------------------------------
# GET /api/reports/academic
# ---------------------------------------------------------------------------

@router.get("/academic")
def get_academic_report(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_scheduler_or_manager),
):
    """Academic structure breakdown."""
    faculties = db.query(Faculty).all()

    result = []
    for fac in faculties:
        dept_ids = [d.dept_id for d in fac.departments]
        degree_count = (
            db.query(func.count(Degree.degree_id))
            .filter(Degree.dept_id.in_(dept_ids))
            .scalar() or 0
        ) if dept_ids else 0

        degree_ids = [deg.degree_id for deg in db.query(Degree).filter(Degree.dept_id.in_(dept_ids)).all()] if dept_ids else []
        batch_count = (
            db.query(func.count(Batch.batch_id))
            .filter(Batch.degree_id.in_(degree_ids))
            .scalar() or 0
        ) if degree_ids else 0

        student_count = 0
        if batch_count:
            student_count = db.query(func.coalesce(func.sum(Batch.student_count), 0)).filter(Batch.degree_id.in_(degree_ids)).scalar() or 0

        module_count = (
            db.query(func.count(Module.module_id))
            .filter(Module.dept_id.in_(dept_ids))
            .scalar() or 0
        ) if dept_ids else 0

        result.append({
            "faculty_id": fac.faculty_id,
            "faculty_name": fac.name,
            "faculty_code": fac.code,
            "departments": len(fac.departments),
            "degrees": degree_count,
            "batches": batch_count,
            "students": int(student_count),
            "modules": module_count,
        })

    # Module credits & hours distribution
    modules = db.query(Module).all()
    credit_distribution = {}
    for m in modules:
        c = str(m.credits or 0)
        credit_distribution[c] = credit_distribution.get(c, 0) + 1

    credits_chart = [{"credits": k, "count": v} for k, v in sorted(credit_distribution.items(), key=lambda x: int(x[0]))]

    return {
        "by_faculty": result,
        "credits_distribution": credits_chart,
        "total_modules": len(modules),
        "total_active_modules": sum(1 for m in modules if int(m.is_active or 0) == 1),
    }


# ---------------------------------------------------------------------------
# GET /api/reports/resources
# ---------------------------------------------------------------------------

@router.get("/resources")
def get_resource_report(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_scheduler_or_manager),
):
    """Resource utilisation by type and faculty."""
    type_rows = (
        db.query(Resource.type, func.count(Resource.resource_id))
        .group_by(Resource.type)
        .all()
    )
    total = sum(c for _, c in type_rows)
    by_type = [
        {
            "name": t or "Other",
            "count": c,
            "percentage": round((c / total) * 100, 1) if total else 0,
        }
        for t, c in type_rows
    ]

    # Sessions per resource type (timetable usage)
    session_type_rows = (
        db.query(Resource.type, func.count(TimetableSession.session_id))
        .join(TimetableSession, TimetableSession.resource_id == Resource.resource_id)
        .group_by(Resource.type)
        .all()
    )
    sessions_by_type = {t or "Other": c for t, c in session_type_rows}

    for item in by_type:
        item["sessions"] = sessions_by_type.get(item["name"], 0)

    # By faculty
    faculties = db.query(Faculty).all()
    by_faculty = []
    for fac in faculties:
        count = db.query(func.count(Resource.resource_id)).filter(Resource.faculty_id == fac.faculty_id).scalar() or 0
        active = db.query(func.count(Resource.resource_id)).filter(Resource.faculty_id == fac.faculty_id, Resource.is_active.is_(True)).scalar() or 0
        by_faculty.append({
            "faculty_name": fac.name,
            "total": count,
            "active": active,
            "inactive": count - active,
        })

    # Capacity distribution
    cap_rows = (
        db.query(Resource.type, func.sum(Resource.capacity))
        .group_by(Resource.type)
        .all()
    )
    capacity_by_type = [{"type": t or "Other", "total_capacity": int(c or 0)} for t, c in cap_rows]

    return {
        "by_type": by_type,
        "by_faculty": by_faculty,
        "capacity_by_type": capacity_by_type,
        "total": total,
    }


# ---------------------------------------------------------------------------
# GET /api/reports/requests
# ---------------------------------------------------------------------------

@router.get("/requests")
def get_requests_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_scheduler_or_manager),
):
    """Event and vehicle request status analytics."""
    q_ev = db.query(EventRequest)
    q_veh = db.query(VehicleRequest)
    q_evt_type = db.query(Event.event_type, func.count(Event.event_id))
    q_recent_ev = db.query(EventRequest)
    q_recent_veh = db.query(VehicleRequest)

    if start_date:
        q_ev = q_ev.filter(EventRequest.event_date >= start_date)
        q_veh = q_veh.filter(VehicleRequest.trip_date >= start_date)
        q_evt_type = q_evt_type.filter(Event.event_date >= start_date)
        q_recent_ev = q_recent_ev.filter(EventRequest.event_date >= start_date)
        q_recent_veh = q_recent_veh.filter(VehicleRequest.trip_date >= start_date)
    if end_date:
        q_ev = q_ev.filter(EventRequest.event_date <= end_date)
        q_veh = q_veh.filter(VehicleRequest.trip_date <= end_date)
        q_evt_type = q_evt_type.filter(Event.event_date <= end_date)
        q_recent_ev = q_recent_ev.filter(EventRequest.event_date <= end_date)
        q_recent_veh = q_recent_veh.filter(VehicleRequest.trip_date <= end_date)

    # Event requests
    ev_total = q_ev.count()
    ev_pending = q_ev.filter(EventRequest.status == RequestStatus.PENDING).count()
    ev_approved = q_ev.filter(EventRequest.status == RequestStatus.APPROVED).count()
    ev_rejected = q_ev.filter(EventRequest.status == RequestStatus.REJECTED).count()

    # Vehicle requests
    veh_total = q_veh.count()
    veh_pending = q_veh.filter(VehicleRequest.status == RequestStatus.PENDING).count()
    veh_approved = q_veh.filter(VehicleRequest.status == RequestStatus.APPROVED).count()
    veh_rejected = q_veh.filter(VehicleRequest.status == RequestStatus.REJECTED).count()

    status_chart = [
        {"status": "Pending",  "events": ev_pending,  "vehicles": veh_pending},
        {"status": "Approved", "events": ev_approved, "vehicles": veh_approved},
        {"status": "Rejected", "events": ev_rejected, "vehicles": veh_rejected},
    ]

    # Event type distribution
    type_rows = q_evt_type.group_by(Event.event_type).all()
    event_types = [{"type": t or "General", "count": c} for t, c in type_rows]

    # Recent event requests
    recent_event_reqs = (
        q_recent_ev
        .order_by(EventRequest.req_id.desc())
        .limit(10)
        .all()
    )
    recent_events_data = []
    for r in recent_event_reqs:
        recent_events_data.append({
            "req_id": r.req_id,
            "event_name": r.event_name,
            "requester": f"{r.requester.first_name} {r.requester.last_name}" if r.requester else "Unknown",
            "event_date": r.event_date.isoformat() if r.event_date else None,
            "status": r.status.value if r.status else "PENDING",
        })

    # Recent vehicle requests
    recent_veh_reqs = (
        q_recent_veh
        .order_by(VehicleRequest.req_id.desc())
        .limit(10)
        .all()
    )
    recent_vehicles_data = []
    for r in recent_veh_reqs:
        recent_vehicles_data.append({
            "req_id": r.req_id,
            "destination": r.destination or "N/A",
            "requester": f"{r.requester.first_name} {r.requester.last_name}" if r.requester else "Unknown",
            "trip_date": r.trip_date.isoformat() if r.trip_date else None,
            "vehicle_type": r.vehicle_type_needed or "N/A",
            "status": r.status.value if r.status else "PENDING",
        })

    return {
        "event_requests": {
            "total": ev_total,
            "pending": ev_pending,
            "approved": ev_approved,
            "rejected": ev_rejected,
        },
        "vehicle_requests": {
            "total": veh_total,
            "pending": veh_pending,
            "approved": veh_approved,
            "rejected": veh_rejected,
        },
        "status_chart": status_chart,
        "event_types": event_types,
        "recent_event_requests": recent_events_data,
        "recent_vehicle_requests": recent_vehicles_data,
    }


# ---------------------------------------------------------------------------
# GET /api/reports/medical
# ---------------------------------------------------------------------------

@router.get("/medical")
def get_medical_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_scheduler_or_manager),
):
    """Medical submission analytics."""
    q_med = db.query(MedicalSubmission)
    q_reason = db.query(MedicalSubmission.reason, func.count(MedicalSubmission.submission_id))

    if start_date:
        q_med = q_med.filter(MedicalSubmission.start_date >= start_date)
        q_reason = q_reason.filter(MedicalSubmission.start_date >= start_date)
    if end_date:
        q_med = q_med.filter(MedicalSubmission.start_date <= end_date)
        q_reason = q_reason.filter(MedicalSubmission.start_date <= end_date)

    total = q_med.count()
    pending = q_med.filter(MedicalSubmission.status == MedicalSubmissionStatus.PENDING).count()
    approved = q_med.filter(MedicalSubmission.status == MedicalSubmissionStatus.APPROVED).count()
    rejected = q_med.filter(MedicalSubmission.status == MedicalSubmissionStatus.REJECTED).count()

    # By reason
    reason_rows = q_reason.group_by(MedicalSubmission.reason).all()
    by_reason = [{"reason": r or "Other", "count": c} for r, c in reason_rows]

    # Recent submissions
    recent = (
        q_med
        .order_by(MedicalSubmission.submission_id.desc())
        .limit(10)
        .all()
    )
    recent_data = []
    for s in recent:
        student_name = "Unknown"
        if s.student:
            student_name = f"{s.student.first_name} {s.student.last_name}"
        recent_data.append({
            "submission_id": s.submission_id,
            "student_name": student_name,
            "reason": s.reason,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "status": s.status.value if s.status else "PENDING",
        })

    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "by_reason": by_reason,
        "recent_submissions": recent_data,
        "status_chart": [
            {"status": "Pending",  "count": pending},
            {"status": "Approved", "count": approved},
            {"status": "Rejected", "count": rejected},
        ],
    }


# ---------------------------------------------------------------------------
# GET /api/reports/timetable
# ---------------------------------------------------------------------------

@router.get("/timetable")
def get_timetable_report(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_scheduler_or_manager),
):
    """Timetable sessions analytics."""
    sessions_by_day = {day: 0 for day in DAY_ORDER}
    rows = (
        db.query(TimetableSession.day_of_week, func.count(TimetableSession.session_id))
        .group_by(TimetableSession.day_of_week)
        .all()
    )
    for day_val, cnt in rows:
        day = _norm_day(day_val)
        if day:
            sessions_by_day[day] = int(cnt)

    weekly_chart = [{"day": d, "sessions": sessions_by_day[d]} for d in DAY_ORDER]

    # Published vs Draft
    published = db.query(func.count(TimetableSession.session_id)).filter(TimetableSession.status == "PUBLISHED").scalar() or 0
    draft = db.query(func.count(TimetableSession.session_id)).filter(TimetableSession.status != "PUBLISHED").scalar() or 0
    total = published + draft

    # Sessions per resource type
    type_rows = (
        db.query(Resource.type, func.count(TimetableSession.session_id))
        .join(TimetableSession, TimetableSession.resource_id == Resource.resource_id)
        .group_by(Resource.type)
        .all()
    )
    by_resource_type = [{"type": t or "Other", "count": c} for t, c in type_rows]

    # Lecturer load (top 10 by session count)
    from ..models.profiles import Lecturer as LecturerProfile
    lect_rows = (
        db.query(LecturerProfile.id, func.count(TimetableSession.session_id))
        .join(TimetableSession, TimetableSession.lecturer_id == LecturerProfile.id)
        .group_by(LecturerProfile.id)
        .order_by(func.count(TimetableSession.session_id).desc())
        .limit(10)
        .all()
    )
    lecturer_load = []
    for lp_id, cnt in lect_rows:
        lp = db.query(LecturerProfile).filter(LecturerProfile.id == lp_id).first()
        name = "Unknown"
        if lp and lp.user:
            name = f"{lp.user.first_name} {lp.user.last_name}".strip()
        lecturer_load.append({"lecturer": name, "sessions": int(cnt)})

    return {
        "total": total,
        "published": published,
        "draft": draft,
        "weekly_chart": weekly_chart,
        "by_resource_type": by_resource_type,
        "lecturer_load": lecturer_load,
    }

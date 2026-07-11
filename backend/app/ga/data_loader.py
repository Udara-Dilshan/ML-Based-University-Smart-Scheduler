"""
GA Data Loader
==============
Fetches and aggregates all scheduling data from the database into
plain Python dataclasses that the GA engine can consume without
needing an active DB session.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import time, timedelta
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

# ─── Domain Dataclasses ──────────────────────────────────────────────────────

DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]


@dataclass
class SlotConstraints:
    """Parsed system_constraints rows for a batch (or global fallback)."""
    working_start: int   # minutes from midnight, e.g. 480 = 08:00
    working_end: int     # e.g. 1020 = 17:00
    lunch_start: int     # e.g. 720 = 12:00
    lunch_end: int       # e.g. 780 = 13:00
    max_consecutive_students: int = 3
    max_consecutive_lecturers: int = 4
    working_days_mask: int = 31  # Mon-Fri bitmask


@dataclass
class BatchInfo:
    batch_id: int
    batch_code: str
    student_count: int
    current_semester: int
    degree_id: int
    constraints: Optional[SlotConstraints] = None


@dataclass
class ModuleInfo:
    module_id: int
    name: str
    code: str
    lecture_hours_per_week: int
    required_resource_type: str  # e.g. "Lecture Hall"


@dataclass
class LecturerInfo:
    lecturer_id: int
    user_id: int
    staff_id: str
    name: str  # full name from users table
    # (day, start_minutes, end_minutes)
    unavailable_slots: List[Tuple[str, int, int]] = field(default_factory=list)


@dataclass
class ResourceInfo:
    resource_id: int
    name: str
    type: str   # "Lecture Hall", "Lab", etc.
    capacity: int
    building: str


@dataclass
class SessionTask:
    """One session that must be scheduled (module × lecturer × batch)."""
    batch_id: int
    module_id: int
    lecturer_user_id: int   # FK in lecturer_module_assignments
    lecturer_id: int        # PK in lecturers table
    hours_per_week: int     # lecture_hours_per_week  → number of 1-hr slots needed
    required_resource_type: str


@dataclass
class SchedulingContext:
    """All data the GA needs, pre-fetched from the DB."""
    batches: Dict[int, BatchInfo]           # batch_id → BatchInfo
    modules: Dict[int, ModuleInfo]          # module_id → ModuleInfo
    lecturers: Dict[int, LecturerInfo]      # lecturer_id → LecturerInfo
    resources: List[ResourceInfo]
    tasks: List[SessionTask]
    global_constraints: SlotConstraints
    active_semester_name: str               # e.g. "Year 2 Semester 2"
    timeslots: List[Tuple[int, int]]        # list of (start_min, end_min) 1-hr blocks


# ─── Loader ──────────────────────────────────────────────────────────────────

def _parse_constraints(rows) -> Optional[SlotConstraints]:
    """Build a SlotConstraints from a list of system_constraint ORM rows."""
    if not rows:
        return None
    c: Dict[str, int] = {r.name: r.value for r in rows}
    return SlotConstraints(
        working_start=c.get("working_hours_start", 480),
        working_end=c.get("working_hours_end", 1020),
        lunch_start=c.get("lunch_break_start", 720),
        lunch_end=c.get("lunch_break_end", 780),
        max_consecutive_students=c.get("max_consecutive_hours_students", 3),
        max_consecutive_lecturers=c.get("max_consecutive_hours_lecturers", 4),
        working_days_mask=c.get("working_days_mask", 31),
    )


def _build_timeslots(constraints: SlotConstraints) -> List[Tuple[int, int]]:
    """
    Generate 1-hour timeslot pairs (start, end) in minutes.
    We generate contiguous slots; batch-specific lunch breaks and working hours
    are strictly enforced in the GA fitness function.
    """
    slots = []
    # Start from a reasonable time like 06:00 to allow variations
    # or just use global constraints start
    t = constraints.working_start
    # If some batches might have longer hours, we should extend the bound.
    # We will just generate 07:00 to 19:00 (420 to 1140) by default to be safe, 
    # but using constraints.working_start and end is fine if we assume global is the max boundary.
    # Let's expand a bit to be safe.
    t = min(420, constraints.working_start) # 07:00 AM minimum
    end_t = max(1140, constraints.working_end) # 19:00 PM maximum
    
    while t + 60 <= end_t:
        end = t + 60
        slots.append((t, end))
        t += 60
    return slots


def load_scheduling_context(
    db: Session,
    degree_id: Optional[int] = None,
    dept_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
) -> SchedulingContext:
    """
    Main entry point.  Fetches everything from the DB and returns a
    SchedulingContext ready for the GA engine.
    """
    from app.models import (
        SystemConstraint, SystemSetting,
        Batch, BatchActiveTerm, Module, Degree,
        LecturerModuleAssignment, Resource,
    )
    from app.models.profiles import Lecturer
    from app.models.lecturer_availability import LecturerAvailability
    from app.models.user import User

    # ── 1. Global system settings ──────────────────────────────────────────
    active_semester_row = (
        db.query(SystemSetting)
        .filter(SystemSetting.category == "ACTIVE_SEMESTER_CYCLE")
        .first()
    )
    active_semester_name = active_semester_row.value if active_semester_row else "Semester 2"

    # ── 2. Global constraints (batch_id IS NULL) ───────────────────────────
    global_constraint_rows = (
        db.query(SystemConstraint)
        .filter(SystemConstraint.batch_id == None)  # noqa: E711
        .all()
    )
    global_constraints = _parse_constraints(global_constraint_rows) or SlotConstraints(
        working_start=480, working_end=1020, lunch_start=720, lunch_end=780
    )

    # ── 3. Active batches ──────────────────────────────────────────────────
    #   A batch is "active" this semester if it has a BatchActiveTerm
    #   matching the active_semester_name with is_active=True.
    #   Optionally filtered by degree / dept / faculty.
    active_term_subq = (
        db.query(BatchActiveTerm.batch_id)
        .filter(
            BatchActiveTerm.is_active == True,  # noqa: E712
        )
        .subquery()
    )

    batch_q = db.query(Batch).filter(Batch.batch_id.in_(active_term_subq))

    if degree_id:
        batch_q = batch_q.filter(Batch.degree_id == degree_id)
        # Resolve dept and faculty
        degree = db.query(Degree).filter(Degree.degree_id == degree_id).first()
        if degree:
            dept_id = degree.dept_id
    
    if dept_id:
        if not degree_id:
            batch_q = batch_q.join(Degree, Batch.degree_id == Degree.degree_id).filter(Degree.dept_id == dept_id)
        from app.models.academic import Department
        dept = db.query(Department).filter(Department.dept_id == dept_id).first()
        if dept:
            faculty_id = dept.faculty_id

    if faculty_id and not dept_id and not degree_id:
        batch_q = batch_q.join(Degree, Batch.degree_id == Degree.degree_id)
        from app.models.academic import Department
        batch_q = batch_q.join(Department, Degree.dept_id == Department.dept_id).filter(
            Department.faculty_id == faculty_id
        )

    raw_batches = batch_q.all()

    if not raw_batches:
        raise ValueError(
            "No active batches found for the given filter. "
            "Check that batches have an active BatchActiveTerm entry."
        )

    batch_ids = [b.batch_id for b in raw_batches]

    # ── 4. Per-batch constraints ───────────────────────────────────────────
    batch_constraint_rows = (
        db.query(SystemConstraint)
        .filter(SystemConstraint.batch_id.in_(batch_ids))
        .all()
    )
    # Group by batch_id
    bc_map: Dict[int, list] = {}
    for row in batch_constraint_rows:
        bc_map.setdefault(row.batch_id, []).append(row)

    batches: Dict[int, BatchInfo] = {}
    for b in raw_batches:
        per_batch_c = _parse_constraints(bc_map.get(b.batch_id, []))
        batches[b.batch_id] = BatchInfo(
            batch_id=b.batch_id,
            batch_code=b.batch_code,
            student_count=b.student_count,
            current_semester=b.current_semester,
            degree_id=b.degree_id,
            constraints=per_batch_c,
        )

    # ── 5. Lecturer module assignments (active only) ───────────────────────
    assignments = (
        db.query(LecturerModuleAssignment)
        .filter(
            LecturerModuleAssignment.batch_id.in_(batch_ids),
            LecturerModuleAssignment.is_active == True,  # noqa: E712
        )
        .all()
    )

    if not assignments:
        raise ValueError(
            "No active lecturer-module assignments found for the selected batches. "
            "Please allocate lecturers to modules first."
        )

    module_ids: Set[int] = {a.module_id for a in assignments}
    lecturer_user_ids: Set[int] = {a.lecturer_user_id for a in assignments}

    # ── 6. Modules ─────────────────────────────────────────────────────────
    raw_modules = db.query(Module).filter(Module.module_id.in_(module_ids)).all()
    modules: Dict[int, ModuleInfo] = {
        m.module_id: ModuleInfo(
            module_id=m.module_id,
            name=m.name,
            code=m.code,
            lecture_hours_per_week=m.lecture_hours_per_week or 2,
            required_resource_type=m.required_resource_type or "Lecture Hall",
        )
        for m in raw_modules
    }

    # ── 7. Lecturers + User names ──────────────────────────────────────────
    raw_lecturers = (
        db.query(Lecturer)
        .filter(Lecturer.user_id.in_(lecturer_user_ids))
        .all()
    )
    # Build a user_id → full_name map
    raw_users = db.query(User).filter(User.user_id.in_(lecturer_user_ids)).all()
    user_name_map = {u.user_id: f"{u.first_name} {u.last_name}" for u in raw_users}

    lecturers: Dict[int, LecturerInfo] = {
        lec.user_id: LecturerInfo(
            lecturer_id=lec.id,
            user_id=lec.user_id,
            staff_id=lec.employee_id or "",
            name=user_name_map.get(lec.user_id, f"Lecturer {lec.user_id}"),
        )
        for lec in raw_lecturers
    }

    # ── 8. Lecturer unavailability ─────────────────────────────────────────
    raw_avail = (
        db.query(LecturerAvailability)
        .filter(
            LecturerAvailability.lecturer_id.in_(
                [lec.lecturer_id for lec in lecturers.values()]
            ),
            LecturerAvailability.status == "approved"
        )
        .all()
    )
    # Map from lecturer_id (PK) to user_id for lookup
    lid_to_uid = {lec.lecturer_id: uid for uid, lec in lecturers.items()}
    for av in raw_avail:
        uid = lid_to_uid.get(av.lecturer_id)
        if uid and uid in lecturers:
            start_m = av.unavailable_start.hour * 60 + av.unavailable_start.minute
            end_m = av.unavailable_end.hour * 60 + av.unavailable_end.minute
            lecturers[uid].unavailable_slots.append((av.day_of_week.upper(), start_m, end_m))

    # ── 9. Resources (active only) ─────────────────────────────────────────
    resource_q = db.query(Resource).filter(Resource.is_active == True)
    if faculty_id:
        # Only use resources from this faculty
        resource_q = resource_q.filter(Resource.faculty_id == faculty_id)
        
    raw_resources = resource_q.all()
    resources: List[ResourceInfo] = [
        ResourceInfo(
            resource_id=r.resource_id,
            name=r.name,
            type=r.type,
            capacity=r.capacity,
            building=r.building or "",
        )
        for r in raw_resources
    ]

    # ── 10. Build session tasks ────────────────────────────────────────────
    #   One SessionTask per lecturer_module_assignment row.
    tasks: List[SessionTask] = []
    for a in assignments:
        mod = modules.get(a.module_id)
        if not mod:
            continue
        lec = lecturers.get(a.lecturer_user_id)
        if not lec:
            continue
        tasks.append(
            SessionTask(
                batch_id=a.batch_id,
                module_id=a.module_id,
                lecturer_user_id=a.lecturer_user_id,
                lecturer_id=lec.lecturer_id,
                hours_per_week=mod.lecture_hours_per_week,
                required_resource_type=mod.required_resource_type,
            )
        )

    # ── 11. Timeslots ─────────────────────────────────────────────────────
    timeslots = _build_timeslots(global_constraints)

    return SchedulingContext(
        batches=batches,
        modules=modules,
        lecturers=lecturers,
        resources=resources,
        tasks=tasks,
        global_constraints=global_constraints,
        active_semester_name=active_semester_name,
        timeslots=timeslots,
    )

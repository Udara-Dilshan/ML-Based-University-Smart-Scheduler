"""
Timetable Router
================
POST /api/timetable/generate  → triggers the GA engine
POST /api/timetable/save      → saves a generated timetable as DRAFT
GET  /api/timetable/manage    → fetch saved timetable sessions
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.ga.data_loader import load_scheduling_context
from app.ga.engine import run_ga
from app.utils.dependencies import require_roles
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/timetable", tags=["timetable"])

class SaveTimetableRequest(BaseModel):
    sessions: List[Dict[str, Any]]
    status: str = "DRAFT"

@router.post("/save")
def save_timetable(req: SaveTimetableRequest, db: Session = Depends(get_db)):
    from app.models.timetable import TimetableSession
    
    if not req.sessions:
        return {"message": "No sessions to save", "count": 0}

    # Gather batch IDs to clear out previous drafts for those specific batches
    batch_ids = list(set(s.get("batch_id") for s in req.sessions if s.get("batch_id")))
    
    if batch_ids:
        db.query(TimetableSession).filter(
            TimetableSession.batch_id.in_(batch_ids),
            TimetableSession.status == "DRAFT"
        ).delete(synchronize_session=False)

    from app.models.settings import SystemSetting
    
    current_academic_year = db.query(SystemSetting).filter(SystemSetting.category == "CURRENT_ACADEMIC_YEAR").first()
    current_semester = db.query(SystemSetting).filter(SystemSetting.category == "ACTIVE_SEMESTER_CYCLE").first()
    
    academic_year_val = current_academic_year.value if current_academic_year else None
    semester_val = current_semester.value if current_semester else None

    new_sessions = []
    
    # Sort sessions to safely merge contiguous blocks
    sorted_sessions = sorted(
        req.sessions,
        key=lambda s: (
            s["batch_id"], s["module_id"], s["lecturer_id"], 
            s["resource_id"], s["day"], 
            datetime.strptime(s["start_time"], "%H:%M").time()
        )
    )
    
    merged_sessions = []
    for s in sorted_sessions:
        try:
            start_t = datetime.strptime(s["start_time"], "%H:%M").time()
            end_t = datetime.strptime(s["end_time"], "%H:%M").time()
        except Exception:
            continue
            
        # Check if we can merge with the last session
        if merged_sessions:
            last = merged_sessions[-1]
            if (last["batch_id"] == s["batch_id"] and
                last["module_id"] == s["module_id"] and
                last["lecturer_id"] == s["lecturer_id"] and
                last["resource_id"] == s["resource_id"] and
                last["day"] == s["day"] and
                last["end_time"] == start_t):
                
                # Merge: extend the end time of the last session
                last["end_time"] = end_t
                continue
                
        merged_sessions.append({
            "batch_id": s["batch_id"],
            "module_id": s["module_id"],
            "lecturer_id": s["lecturer_id"],
            "resource_id": s["resource_id"],
            "day": s["day"],
            "start_time": start_t,
            "end_time": end_t,
        })

    for m in merged_sessions:
        new_sessions.append(TimetableSession(
            batch_id=m["batch_id"],
            module_id=m["module_id"],
            lecturer_id=m["lecturer_id"],
            resource_id=m["resource_id"],
            day_of_week=m["day"],
            start_time=m["start_time"],
            end_time=m["end_time"],
            type="LECTURE",
            status=req.status,
            academic_year=academic_year_val,
            semester=semester_val
        ))
        
    db.add_all(new_sessions)
    db.commit()
    
    return {"message": "Timetable saved successfully", "count": len(new_sessions)}

@router.get("/filters")
def get_timetable_filters(db: Session = Depends(get_db)):
    from app.models.timetable import TimetableSession
    
    academic_years = db.query(TimetableSession.academic_year).filter(TimetableSession.academic_year.isnot(None)).distinct().all()
    semesters = db.query(TimetableSession.semester).filter(TimetableSession.semester.isnot(None)).distinct().all()
    
    return {
        "academic_years": [ay[0] for ay in academic_years if ay[0]],
        "semesters": [s[0] for s in semesters if s[0]]
    }

@router.get("/manage")
def get_managed_timetables(
    batch_id: Optional[int] = None,
    degree_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    dept_id: Optional[int] = None,
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
    status: Optional[str] = "DRAFT",
    db: Session = Depends(get_db)
):
    from app.models.timetable import TimetableSession
    from app.models.academic import Batch, Degree, Department, Module
    from app.models.profiles import Lecturer
    from app.models.resource import Resource
    
    query = db.query(TimetableSession).join(Batch).join(Module).join(Lecturer).join(Resource)
    
    if status:
        query = query.filter(TimetableSession.status == status)
        
    if academic_year:
        query = query.filter(TimetableSession.academic_year == academic_year)
    if semester:
        query = query.filter(TimetableSession.semester == semester)
    
    if batch_id:
        query = query.filter(TimetableSession.batch_id == batch_id)
    elif degree_id:
        query = query.filter(Batch.degree_id == degree_id)
    elif dept_id:
        query = query.join(Degree, Batch.degree_id == Degree.degree_id).filter(Degree.dept_id == dept_id)
    elif faculty_id:
        query = query.join(Degree, Batch.degree_id == Degree.degree_id)\
                     .join(Department, Degree.dept_id == Department.dept_id)\
                     .filter(Department.faculty_id == faculty_id)
        
    results = query.all()
    
    from app.models.settings import SystemConstraint
    
    # Preload constraints
    all_constraints = db.query(SystemConstraint).filter(SystemConstraint.name.in_(["lunch_break_start", "lunch_break_end"])).all()
    global_lunch_start = 720
    global_lunch_end = 780
    batch_lunch_map = {}
    
    for c in all_constraints:
        if c.batch_id is None:
            if c.name == "lunch_break_start":
                global_lunch_start = int(c.value)
            elif c.name == "lunch_break_end":
                global_lunch_end = int(c.value)
        else:
            if c.batch_id not in batch_lunch_map:
                batch_lunch_map[c.batch_id] = {"start": None, "end": None}
            if c.name == "lunch_break_start":
                batch_lunch_map[c.batch_id]["start"] = int(c.value)
            elif c.name == "lunch_break_end":
                batch_lunch_map[c.batch_id]["end"] = int(c.value)

    sessions = []
    for r in results:
        # Avoid division by zero and format correctly
        start_mins = r.start_time.hour * 60 + r.start_time.minute
        end_mins = r.end_time.hour * 60 + r.end_time.minute
        duration = max(1, (end_mins - start_mins) // 60)
        
        # Determine lunch
        l_start = global_lunch_start
        l_end = global_lunch_end
        if r.batch_id in batch_lunch_map:
            if batch_lunch_map[r.batch_id]["start"] is not None:
                l_start = batch_lunch_map[r.batch_id]["start"]
            if batch_lunch_map[r.batch_id]["end"] is not None:
                l_end = batch_lunch_map[r.batch_id]["end"]

        lunch_str = f"{l_start//60:02d}:{l_start%60:02d}"

        sessions.append({
            "session_id": r.session_id,
            "batch_id": r.batch_id,
            "batch_code": r.batch.batch_code,
            "module_id": r.module_id,
            "module_name": r.module.name,
            "module_code": r.module.code,
            "lecturer_id": r.lecturer_id,
            "lecturer_name": f"{r.lecturer.user.first_name} {r.lecturer.user.last_name}" if r.lecturer and r.lecturer.user else "N/A",
            "resource_id": r.resource_id,
            "room_name": r.resource.name,
            "room_type": r.resource.type,
            "building": r.resource.building,
            "day": r.day_of_week,
            "start_time": r.start_time.strftime("%H:%M"),
            "end_time": r.end_time.strftime("%H:%M"),
            "status": r.status.value if hasattr(r.status, 'value') else r.status,
            "duration_hours": duration,
            "faculty_id": r.batch.degree.department.faculty_id,
            "dept_id": r.batch.degree.dept_id,
            "lunch_start": lunch_str,
            "academic_year": r.academic_year,
            "semester": r.semester
        })
        
    return {"sessions": sessions}


# ─── Request / Response Schemas ──────────────────────────────────────────────

class GenerateRequest(BaseModel):
    degree_id: Optional[int] = None
    dept_id: Optional[int] = None
    faculty_id: Optional[int] = None
    population_size: int = 200
    generations: int = 300
    seed: Optional[int] = 42


class GenerateResponse(BaseModel):
    status: str
    best_penalty: float
    conflict_free: bool
    total_sessions: int
    evolution_log: list
    timetable: list
    metadata: dict


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
def generate_timetable(
    body: GenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Aggregate scheduling data for the given filter (degree / dept / faculty),
    run the Genetic Algorithm, and return the generated timetable.
    """
    try:
        ctx = load_scheduling_context(
            db=db,
            degree_id=body.degree_id,
            dept_id=body.dept_id,
            faculty_id=body.faculty_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Data loading error: {exc}")

    try:
        result = run_ga(
            ctx=ctx,
            population_size=body.population_size,
            generations=body.generations,
            seed=body.seed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"GA engine error: {exc}")

    return result


@router.get("/")
def list_sessions(db: Session = Depends(get_db)):
    """Placeholder — returns empty list until save feature is built."""
    return []


@router.get("/context")
def get_context_preview(
    degree_id: Optional[int] = Query(None),
    dept_id: Optional[int] = Query(None),
    faculty_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Preview what data will be used for generation — useful for debugging.
    Returns counts without running the GA.
    """
    try:
        ctx = load_scheduling_context(
            db=db,
            degree_id=degree_id,
            dept_id=dept_id,
            faculty_id=faculty_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    task_slots_count = sum(t.hours_per_week for t in ctx.tasks)

    return {
        "active_semester": ctx.active_semester_name,
        "batches_count": len(ctx.batches),
        "batches": [
            {
                "batch_id": b.batch_id,
                "batch_code": b.batch_code,
                "student_count": b.student_count,
                "current_semester": b.current_semester,
                "specific_constraints": {
                    "working_hours": f"{b.constraints.working_start//60:02d}:00 - {b.constraints.working_end//60:02d}:00",
                    "lunch_break": f"{b.constraints.lunch_start//60:02d}:00 - {b.constraints.lunch_end//60:02d}:00",
                    "max_consecutive_students": b.constraints.max_consecutive_students,
                    "max_consecutive_lecturers": b.constraints.max_consecutive_lecturers,
                } if b.constraints else None,
            }
            for b in ctx.batches.values()
        ],
        "modules_count": len(ctx.modules),
        "lecturers_count": len(ctx.lecturers),
        "resources_count": len(ctx.resources),
        "task_slots_count": task_slots_count,
        "timeslots_count": len(ctx.timeslots),
        "timeslots": [
            {
                "start": f"{s//60:02d}:{s%60:02d}",
                "end": f"{e//60:02d}:{e%60:02d}",
            }
            for s, e in ctx.timeslots
        ],
        "global_constraints": {
            "working_hours": f"{ctx.global_constraints.working_start//60:02d}:00 - {ctx.global_constraints.working_end//60:02d}:00",
            "lunch_break": f"{ctx.global_constraints.lunch_start//60:02d}:00 - {ctx.global_constraints.lunch_end//60:02d}:00",
            "max_consecutive_students": ctx.global_constraints.max_consecutive_students,
            "max_consecutive_lecturers": ctx.global_constraints.max_consecutive_lecturers,
        },
    }

class EditSessionRequest(BaseModel):
    day: str
    start_time: str
    end_time: str
    resource_id: int
    lecturer_id: Optional[int] = None

@router.put("/sessions/{session_id}")
def update_session(session_id: int, req: EditSessionRequest, db: Session = Depends(get_db)):
    from app.models.timetable import TimetableSession
    from datetime import datetime

    session = db.query(TimetableSession).filter(TimetableSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    try:
        new_start = datetime.strptime(req.start_time, "%H:%M").time()
        new_end = datetime.strptime(req.end_time, "%H:%M").time()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
        
    start_mins = new_start.hour * 60 + new_start.minute
    end_mins = new_end.hour * 60 + new_end.minute

    from app.models.settings import SystemConstraint
    
    constraints = db.query(SystemConstraint).filter(
        SystemConstraint.name.in_([
            "lunch_break_start", "lunch_break_end",
            "working_hours_start", "working_hours_end"
        ])
    ).all()
    
    global_lunch_start = 720
    global_lunch_end = 780
    global_work_start = 480
    global_work_end = 1020

    for c in constraints:
        if c.batch_id is None:
            if c.name == "lunch_break_start": global_lunch_start = int(c.value)
            elif c.name == "lunch_break_end": global_lunch_end = int(c.value)
            elif c.name == "working_hours_start": global_work_start = int(c.value)
            elif c.name == "working_hours_end": global_work_end = int(c.value)
                
    batch_lunch_start = global_lunch_start
    batch_lunch_end = global_lunch_end
    batch_work_start = global_work_start
    batch_work_end = global_work_end

    for c in constraints:
        if c.batch_id == session.batch_id:
            if c.name == "lunch_break_start": batch_lunch_start = int(c.value)
            elif c.name == "lunch_break_end": batch_lunch_end = int(c.value)
            elif c.name == "working_hours_start": batch_work_start = int(c.value)
            elif c.name == "working_hours_end": batch_work_end = int(c.value)
                
    if start_mins < batch_lunch_end and batch_lunch_start < end_mins:
        raise HTTPException(
            status_code=409, 
            detail=f"Conflict: This time overlaps with the batch's lunch break ({batch_lunch_start//60:02d}:{batch_lunch_start%60:02d} - {batch_lunch_end//60:02d}:{batch_lunch_end%60:02d})."
        )
        
    if start_mins < batch_work_start or end_mins > batch_work_end:
        raise HTTPException(
            status_code=409, 
            detail=f"Validation Error: Time is outside the batch's working hours ({batch_work_start//60:02d}:{batch_work_start%60:02d} - {batch_work_end//60:02d}:{batch_work_end%60:02d})."
        )

    target_lecturer_id = req.lecturer_id if req.lecturer_id is not None else session.lecturer_id

    # Validation: Check conflicts with other sessions
    conflicts_query = db.query(TimetableSession).filter(
        TimetableSession.day_of_week == req.day,
        TimetableSession.session_id != session_id,
        TimetableSession.status == session.status
    )
    if session.status == "PUBLISHED":
        conflicts_query = conflicts_query.filter(
            TimetableSession.academic_year == session.academic_year,
            TimetableSession.semester == session.semester
        )
    conflicts = conflicts_query.all()
    
    for other in conflicts:
        o_start = other.start_time.hour * 60 + other.start_time.minute
        o_end = other.end_time.hour * 60 + other.end_time.minute
        
        # Overlap logic
        if start_mins < o_end and o_start < end_mins:
            if other.resource_id == req.resource_id:
                raise HTTPException(status_code=409, detail=f"Conflict: Room '{other.resource.name}' is already booked.")
            if other.lecturer_id == target_lecturer_id:
                raise HTTPException(status_code=409, detail="Conflict: Lecturer is booked for another class.")
            if other.batch_id == session.batch_id:
                raise HTTPException(status_code=409, detail="Conflict: Batch already has a class scheduled at this time.")

    # All clear, update
    # Store old values for email
    was_published = session.status == "PUBLISHED"
    old_room_name = session.resource.name if session.resource else ""
    old_lecturer_name = f"{session.lecturer.user.first_name} {session.lecturer.user.last_name}" if session.lecturer and session.lecturer.user else ""

    session.day_of_week = req.day
    session.start_time = new_start
    session.end_time = new_end
    session.resource_id = req.resource_id
    session.lecturer_id = target_lecturer_id
    db.commit()
    db.refresh(session)
    
    # Fire notifications if it was a published session
    if was_published:
        from app.utils.email import send_timetable_update_email
        from app.models.profiles import Student
        
        details = {
            "module_code": session.module.code if session.module else "",
            "module_name": session.module.name if session.module else "",
            "day": session.day_of_week,
            "start_time": session.start_time.strftime("%H:%M"),
            "end_time": session.end_time.strftime("%H:%M"),
            "room_name": session.resource.name if session.resource else "",
            "lecturer_name": f"{session.lecturer.user.first_name} {session.lecturer.user.last_name}" if session.lecturer and session.lecturer.user else "",
            "batch_code": session.batch.batch_code if session.batch else ""
        }
        
        # Notify Lecturer
        if session.lecturer and session.lecturer.user and session.lecturer.user.email:
            send_timetable_update_email(
                to_emails=[session.lecturer.user.email],
                role="LECTURER",
                subject="Timetable Update - Class Rescheduled",
                details=details
            )
            
        # Notify Batch Students
        students = db.query(Student).filter(Student.batch == session.batch_id).all()
        student_emails = [s.user.email for s in students if s.user and s.user.email]
        if student_emails:
            # Chunking to avoid massive To header (optional, but good practice)
            chunk_size = 50
            for i in range(0, len(student_emails), chunk_size):
                send_timetable_update_email(
                    to_emails=student_emails[i:i+chunk_size],
                    role="STUDENT",
                    subject="Timetable Update - Class Rescheduled",
                    details=details
                )
    
    return {"message": "Session updated successfully"}

class SuggestRequest(BaseModel):
    session_id: int
    lecturer_id: Optional[int] = None

@router.post("/suggest-alternatives")
def suggest_alternatives(req: SuggestRequest, db: Session = Depends(get_db)):
    """AI Conflict Resolution: Finds 3 free slots for the given session's lecturer, batch and resource."""
    from app.models.timetable import TimetableSession
    from app.models.resource import Resource
    from app.models.lecturer_availability import LecturerAvailability
    from app.models.settings import SystemConstraint
    
    session = db.query(TimetableSession).filter(TimetableSession.session_id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    duration_mins = (session.end_time.hour * 60 + session.end_time.minute) - (session.start_time.hour * 60 + session.start_time.minute)
    faculty_id = session.batch.degree.department.faculty_id
    
    # Filter rooms strictly by Faculty ID
    valid_rooms = db.query(Resource).filter(
        Resource.type == session.resource.type,
        Resource.is_active == True,
        Resource.faculty_id == faculty_id,
        Resource.capacity >= session.batch.student_count
    ).all()
    
    # Retrieve Constraints (Global & Batch)
    global_cs = {c.name: c.value for c in db.query(SystemConstraint).filter(SystemConstraint.batch_id == None).all()}
    batch_cs = {c.name: c.value for c in db.query(SystemConstraint).filter(SystemConstraint.batch_id == session.batch_id).all()}
    
    w_start = int(batch_cs.get("working_hours_start", global_cs.get("working_hours_start", 480)))
    w_end = int(batch_cs.get("working_hours_end", global_cs.get("working_hours_end", 1020)))
    l_start = int(batch_cs.get("lunch_break_start", global_cs.get("lunch_break_start", 720)))
    l_end = int(batch_cs.get("lunch_break_end", global_cs.get("lunch_break_end", 780)))
    
    # Lecturer unavailability records
    target_lecturer_id = req.lecturer_id if req.lecturer_id is not None else session.lecturer_id
    
    unavail = db.query(LecturerAvailability).filter(
        LecturerAvailability.lecturer_id == target_lecturer_id
    ).all()
    
    DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    
    all_sessions_query = db.query(TimetableSession).filter(
        TimetableSession.status == session.status
    )
    if session.status == "PUBLISHED":
        all_sessions_query = all_sessions_query.filter(
            TimetableSession.academic_year == session.academic_year,
            TimetableSession.semester == session.semester
        )
    all_sessions = all_sessions_query.all()
    suggestions = []
    
    for day in DAYS:
        # Check Lecturer Unavailability for the day
        day_unavail = [u for u in unavail if u.day_of_week == day]
        
        for t in range(w_start, w_end - duration_mins + 60, 60):
            slot_start = t
            slot_end = t + duration_mins
            
            # 1. Lunch Break Constraint
            if slot_start < l_end and l_start < slot_end:
                continue
                
            # 2. Lecturer Availability Check
            lec_conflict = False
            for u in day_unavail:
                u_start = u.unavailable_start.hour * 60 + u.unavailable_start.minute
                u_end = u.unavailable_end.hour * 60 + u.unavailable_end.minute
                if slot_start < u_end and u_start < slot_end:
                    lec_conflict = True
                    break
            if lec_conflict:
                continue
                
            for room in valid_rooms:
                conflict = False
                for other in all_sessions:
                    if other.session_id == session.session_id or other.day_of_week != day:
                        continue
                        
                    o_start = other.start_time.hour * 60 + other.start_time.minute
                    o_end = other.end_time.hour * 60 + other.end_time.minute
                    
                    if slot_start < o_end and o_start < slot_end:
                        if other.resource_id == room.resource_id or other.lecturer_id == target_lecturer_id or other.batch_id == session.batch_id:
                            conflict = True
                            break
                
                if not conflict:
                    suggestions.append({
                        "day": day,
                        "start_time": f"{slot_start//60:02d}:{slot_start%60:02d}",
                        "end_time": f"{slot_end//60:02d}:{slot_end%60:02d}",
                        "resource_id": room.resource_id,
                        "room_name": room.name
                    })
                    if len(suggestions) == 3:
                        return {"suggestions": suggestions}
                        
    return {"suggestions": suggestions}

class PublishRequest(BaseModel):
    batch_id: Optional[int] = None
    degree_id: Optional[int] = None
    dept_id: Optional[int] = None
    faculty_id: Optional[int] = None

@router.post("/publish")
def publish_timetable(req: PublishRequest, db: Session = Depends(get_db)):
    from app.models.timetable import TimetableSession
    from app.models.academic import Batch, Degree, Department
    
    query = db.query(TimetableSession).join(Batch)
    
    if req.batch_id:
        query = query.filter(TimetableSession.batch_id == req.batch_id)
    elif req.degree_id:
        query = query.filter(Batch.degree_id == req.degree_id)
    elif req.dept_id:
        query = query.join(Degree).filter(Degree.dept_id == req.dept_id)
    elif req.faculty_id:
        query = query.join(Degree).join(Department).filter(Department.faculty_id == req.faculty_id)
        
    draft_sessions = query.filter(TimetableSession.status == "DRAFT").all()
    if not draft_sessions:
        return {"message": "No draft sessions found to publish."}
        
    count = 0
    
    # Auto-archive: for each DRAFT, find the matching PUBLISHED and archive them
    for s in draft_sessions:
        if s.academic_year and s.semester:
            existing_published = db.query(TimetableSession).filter(
                TimetableSession.batch_id == s.batch_id,
                TimetableSession.academic_year == s.academic_year,
                TimetableSession.semester == s.semester,
                TimetableSession.status == "PUBLISHED"
            ).all()
            
            for ep in existing_published:
                ep.status = "ARCHIVED"
                
        s.status = "PUBLISHED"
        count += 1
        
    db.commit()
    return {"message": f"Successfully published {count} sessions."}

@router.post("/archive")
def archive_timetable(req: PublishRequest, db: Session = Depends(get_db)):
    from app.models.timetable import TimetableSession
    from app.models.academic import Batch, Degree, Department
    
    query = db.query(TimetableSession).join(Batch)
    
    if req.batch_id:
        query = query.filter(TimetableSession.batch_id == req.batch_id)
    elif req.degree_id:
        query = query.filter(Batch.degree_id == req.degree_id)
    elif req.dept_id:
        query = query.join(Degree).filter(Degree.dept_id == req.dept_id)
    elif req.faculty_id:
        query = query.join(Degree).join(Department).filter(Department.faculty_id == req.faculty_id)
        
    sessions = query.filter(TimetableSession.status == "PUBLISHED").all()
    count = 0
    for s in sessions:
        s.status = "ARCHIVED"
        count += 1
        
    db.commit()
    return {"message": f"Successfully archived {count} sessions."}

@router.get("/lecturer/me")
def get_lecturer_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.LECTURER))
):
    from app.models.timetable import TimetableSession
    from app.models.settings import SystemSetting
    
    if not current_user.lecturer_profile:
        raise HTTPException(status_code=404, detail="Lecturer profile not found")
        
    lecturer_id = current_user.lecturer_profile.id
    
    current_academic_year = db.query(SystemSetting).filter(SystemSetting.category == "CURRENT_ACADEMIC_YEAR").first()
    current_semester = db.query(SystemSetting).filter(SystemSetting.category == "ACTIVE_SEMESTER_CYCLE").first()
    
    academic_year_val = current_academic_year.value if current_academic_year else None
    semester_val = current_semester.value if current_semester else None
    
    query = db.query(TimetableSession).filter(
        TimetableSession.lecturer_id == lecturer_id,
        TimetableSession.status == "PUBLISHED"
    )
    
    if academic_year_val:
        query = query.filter(TimetableSession.academic_year == academic_year_val)
    if semester_val:
        query = query.filter(TimetableSession.semester == semester_val)
        
    sessions = query.all()
    
    result = []
    for r in sessions:
        result.append({
            "session_id": r.session_id,
            "batch_id": r.batch_id,
            "module_id": r.module_id,
            "lecturer_id": r.lecturer_id,
            "resource_id": r.resource_id,
            "day_of_week": r.day_of_week,
            "start_time": r.start_time.strftime("%H:%M"),
            "end_time": r.end_time.strftime("%H:%M"),
            "status": r.status.value if hasattr(r.status, 'value') else r.status,
            "room_name": r.resource.name if r.resource else "N/A",
            "module_code": r.module.code if r.module else "N/A",
            "module_name": r.module.name if r.module else "N/A"
        })
    return result

@router.get("/student/me")
def get_student_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.STUDENT))
):
    from app.models.timetable import TimetableSession
    
    if not current_user.student_profile or not current_user.student_profile.batch:
        raise HTTPException(status_code=404, detail="Student profile or batch not found")
        
    batch_id = current_user.student_profile.batch
    
    from app.models.settings import SystemSetting
    
    current_academic_year = db.query(SystemSetting).filter(SystemSetting.category == "CURRENT_ACADEMIC_YEAR").first()
    current_semester = db.query(SystemSetting).filter(SystemSetting.category == "ACTIVE_SEMESTER_CYCLE").first()
    
    academic_year_val = current_academic_year.value if current_academic_year else None
    semester_val = current_semester.value if current_semester else None
    
    query = db.query(TimetableSession).filter(
        TimetableSession.batch_id == batch_id,
        TimetableSession.status == "PUBLISHED"
    )
    
    if academic_year_val:
        query = query.filter(TimetableSession.academic_year == academic_year_val)
    if semester_val:
        query = query.filter(TimetableSession.semester == semester_val)
        
    sessions = query.all()
    
    result = []
    for r in sessions:
        result.append({
            "session_id": r.session_id,
            "batch_id": r.batch_id,
            "module_id": r.module_id,
            "lecturer_id": r.lecturer_id,
            "resource_id": r.resource_id,
            "day_of_week": r.day_of_week,
            "start_time": r.start_time.strftime("%H:%M"),
            "end_time": r.end_time.strftime("%H:%M"),
            "status": r.status.value if hasattr(r.status, 'value') else r.status,
            "room_name": r.resource.name if r.resource else "N/A",
            "module_code": r.module.code if r.module else "N/A",
            "module_name": r.module.name if r.module else "N/A",
            "lecturer_name": f"{r.lecturer.user.first_name} {r.lecturer.user.last_name}" if r.lecturer and r.lecturer.user else "N/A"
        })
    return result
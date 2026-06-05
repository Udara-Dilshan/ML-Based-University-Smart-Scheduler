"""
AI-Assisted Booking Engine

Rule-based conflict detection for:
  - EventRequests: clash against published timetable + approved events + capacity check
  - VehicleRequests: capacity check + availability check at requested time
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.event import EventRequest, RequestStatus, VehicleRequest
from app.models.resource import Resource
from app.models.event import Vehicle
from app.models.timetable import TimetableSession

DAY_MAP = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday",
}

# How many alternative venues to suggest on a clash
MAX_ALTERNATIVES = 3


def _times_overlap(
    s1: datetime.time,
    e1: datetime.time,
    s2: datetime.time,
    e2: datetime.time,
) -> bool:
    """Return True if time ranges [s1,e1) and [s2,e2) overlap."""
    return s1 < e2 and s2 < e1


# ---------------------------------------------------------------------------
# EVENT / VENUE REQUEST AI CHECK
# ---------------------------------------------------------------------------

def check_event_request(db: Session, req: EventRequest) -> Dict[str, Any]:
    """
    Run AI pre-processing on an EventRequest.

    Returns a dict:
      {
        "ai_status":     "CLEAR" | "CLASH" | "CAPACITY_MISMATCH",
        "clash_detail":  str | None,
        "alternatives":  List[dict] | [],
        "resource_capacity": int
      }
    """
    resource: Optional[Resource] = db.query(Resource).filter(
        Resource.resource_id == req.resource_id
    ).first()

    if not resource:
        return {
            "ai_status": "CLASH",
            "clash_detail": "Requested venue not found in system.",
            "alternatives": [],
            "resource_capacity": 0,
        }

    # ── 1. Capacity check ──────────────────────────────────────────────────
    if resource.capacity < req.participant_count:
        return {
            "ai_status": "CAPACITY_MISMATCH",
            "clash_detail": (
                f"Required: {req.participant_count}, "
                f"Available in {resource.name}: {resource.capacity}"
            ),
            "alternatives": [],
            "resource_capacity": resource.capacity,
        }

    # ── 2. Timetable clash (published academic sessions) ───────────────────
    day_name = DAY_MAP.get(req.event_date.weekday(), "")
    timetable_clash = (
        db.query(TimetableSession)
        .filter(
            TimetableSession.resource_id == req.resource_id,
            TimetableSession.day_of_week == day_name,
            TimetableSession.status == "PUBLISHED",
        )
        .all()
    )

    for session in timetable_clash:
        if _times_overlap(req.start_time, req.end_time, session.start_time, session.end_time):
            batch_info = f"Batch {session.batch_id}" if session.batch_id else "Unknown batch"
            clash_label = (
                f"Booked for Academic Session ({batch_info}) "
                f"at {session.start_time.strftime('%H:%M')}"
            )
            return {
                "ai_status": "CLASH",
                "clash_detail": clash_label,
                "alternatives": _find_alternative_venues(
                    db, req.resource_id, resource.type,
                    req.event_date, req.start_time, req.end_time,
                    req.participant_count,
                ),
                "resource_capacity": resource.capacity,
            }

    # ── 3. Already-approved event clash ───────────────────────────────────
    from app.models.event import Event  # avoid circular at module level
    approved_events = (
        db.query(Event)
        .filter(
            Event.resource_id == req.resource_id,
            Event.event_date == req.event_date,
        )
        .all()
    )
    for event in approved_events:
        # Event uses DateTime for start_time/end_time — extract time part
        ev_start = event.start_time.time() if isinstance(event.start_time, datetime.datetime) else event.start_time
        ev_end = event.end_time.time() if isinstance(event.end_time, datetime.datetime) else event.end_time
        if _times_overlap(req.start_time, req.end_time, ev_start, ev_end):
            return {
                "ai_status": "CLASH",
                "clash_detail": (
                    f"Venue booked for '{event.event_name}' "
                    f"at {ev_start.strftime('%H:%M')}"
                ),
                "alternatives": _find_alternative_venues(
                    db, req.resource_id, resource.type,
                    req.event_date, req.start_time, req.end_time,
                    req.participant_count,
                ),
                "resource_capacity": resource.capacity,
            }

    # ── 4. Clash from other approved event_requests ────────────────────────
    conflicting_req = (
        db.query(EventRequest)
        .filter(
            EventRequest.resource_id == req.resource_id,
            EventRequest.event_date == req.event_date,
            EventRequest.status == RequestStatus.APPROVED,
            EventRequest.req_id != req.req_id,
        )
        .all()
    )
    for other in conflicting_req:
        if _times_overlap(req.start_time, req.end_time, other.start_time, other.end_time):
            return {
                "ai_status": "CLASH",
                "clash_detail": (
                    f"Venue already approved for '{other.event_name}' "
                    f"at {other.start_time.strftime('%H:%M')}"
                ),
                "alternatives": _find_alternative_venues(
                    db, req.resource_id, resource.type,
                    req.event_date, req.start_time, req.end_time,
                    req.participant_count,
                ),
                "resource_capacity": resource.capacity,
            }

    return {
        "ai_status": "CLEAR",
        "clash_detail": None,
        "alternatives": [],
        "resource_capacity": resource.capacity,
    }


def _find_alternative_venues(
    db: Session,
    excluded_resource_id: int,
    resource_type: str,
    event_date: datetime.date,
    start_time: datetime.time,
    end_time: datetime.time,
    participant_count: int,
) -> List[Dict[str, Any]]:
    """Find up to MAX_ALTERNATIVES free venues of similar type with enough capacity."""
    candidates = (
        db.query(Resource)
        .filter(
            Resource.resource_id != excluded_resource_id,
            Resource.type == resource_type,
            Resource.capacity >= participant_count,
            Resource.is_active.is_(True),
        )
        .order_by(Resource.capacity.asc())
        .all()
    )

    day_name = DAY_MAP.get(event_date.weekday(), "")
    from app.models.event import Event

    free = []
    for candidate in candidates:
        # Check timetable
        tt_clash = (
            db.query(TimetableSession)
            .filter(
                TimetableSession.resource_id == candidate.resource_id,
                TimetableSession.day_of_week == day_name,
                TimetableSession.status == "PUBLISHED",
            )
            .all()
        )
        has_clash = any(
            _times_overlap(start_time, end_time, s.start_time, s.end_time)
            for s in tt_clash
        )
        if has_clash:
            continue

        # Check approved events
        ev_clash = (
            db.query(Event)
            .filter(
                Event.resource_id == candidate.resource_id,
                Event.event_date == event_date,
            )
            .all()
        )
        has_clash = False
        for event in ev_clash:
            ev_start = event.start_time.time() if isinstance(event.start_time, datetime.datetime) else event.start_time
            ev_end = event.end_time.time() if isinstance(event.end_time, datetime.datetime) else event.end_time
            if _times_overlap(start_time, end_time, ev_start, ev_end):
                has_clash = True
                break
        if has_clash:
            continue

        free.append({
            "resource_id": candidate.resource_id,
            "name": candidate.name,
            "type": candidate.type,
            "capacity": candidate.capacity,
            "location": candidate.location,
        })
        if len(free) >= MAX_ALTERNATIVES:
            break

    return free


# ---------------------------------------------------------------------------
# VEHICLE REQUEST AI CHECK
# ---------------------------------------------------------------------------

def check_vehicle_request(db: Session, req: VehicleRequest) -> Dict[str, Any]:
    """
    Run AI pre-processing on a VehicleRequest.

    Returns a dict:
      {
        "ai_status":          "CLEAR" | "CAPACITY_MISMATCH" | "NO_VEHICLE_AVAILABLE",
        "clash_detail":       str | None,
        "available_vehicles": List[dict]
      }
    """
    vehicle_type = (req.vehicle_type_needed or "").strip()
    passenger_count = req.passenger_count or 0

    query = db.query(Vehicle).filter(Vehicle.is_available.is_(True))
    if vehicle_type:
        query = query.filter(Vehicle.type == vehicle_type)

    all_matching = query.order_by(Vehicle.capacity.asc()).all()

    if not all_matching:
        return {
            "ai_status": "NO_VEHICLE_AVAILABLE",
            "clash_detail": (
                f"No available {vehicle_type} vehicles in the fleet."
                if vehicle_type else "No available vehicles in the fleet."
            ),
            "available_vehicles": [],
        }

    # Filter out vehicles already assigned and approved on the same date + overlapping time
    free_vehicles = []
    for vehicle in all_matching:
        if req.start_time and req.end_time:
            conflicting = (
                db.query(VehicleRequest)
                .filter(
                    VehicleRequest.assigned_vehicle_id == vehicle.vehicle_id,
                    VehicleRequest.trip_date == req.trip_date,
                    VehicleRequest.status == RequestStatus.APPROVED,
                    VehicleRequest.req_id != req.req_id,
                )
                .all()
            )
            has_clash = any(
                _times_overlap(req.start_time, req.end_time, vr.start_time, vr.end_time)
                for vr in conflicting
                if vr.start_time and vr.end_time
            )
            if has_clash:
                continue

        capacity_ok = vehicle.capacity >= passenger_count
        free_vehicles.append({
            "vehicle_id": vehicle.vehicle_id,
            "reg_number": vehicle.reg_number,
            "type": vehicle.type,
            "capacity": vehicle.capacity,
            "driver_name": vehicle.driver_name,
            "capacity_ok": capacity_ok,
        })

    if not free_vehicles:
        return {
            "ai_status": "NO_VEHICLE_AVAILABLE",
            "clash_detail": (
                f"All {vehicle_type} vehicles are booked at this time."
                if vehicle_type else "All vehicles are booked at this time."
            ),
            "available_vehicles": [],
        }

    # Check if any free vehicle has enough capacity
    capable = [v for v in free_vehicles if v["capacity_ok"]]
    if not capable:
        smallest_cap = max(v["capacity"] for v in free_vehicles)
        return {
            "ai_status": "CAPACITY_MISMATCH",
            "clash_detail": (
                f"Required: {passenger_count} passengers, "
                f"Largest available {vehicle_type}: {smallest_cap} seats"
            ),
            "available_vehicles": free_vehicles,
        }

    return {
        "ai_status": "CLEAR",
        "clash_detail": None,
        "available_vehicles": free_vehicles,
    }


# ---------------------------------------------------------------------------
# DIRECT EVENT CONFLICT CHECK (for Admin/Resource Manager direct-add)
# ---------------------------------------------------------------------------

def check_direct_event(
    db: Session,
    resource_id: int,
    event_date: datetime.date,
    start_time: datetime.time,
    end_time: datetime.time,
    exclude_event_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Check if a direct event (admin/manager created) has conflicts.

    Returns:
      {
        "has_conflict": bool,
        "clash_detail": str | None
      }
    """
    day_name = DAY_MAP.get(event_date.weekday(), "")

    # Check timetable
    timetable_sessions = (
        db.query(TimetableSession)
        .filter(
            TimetableSession.resource_id == resource_id,
            TimetableSession.day_of_week == day_name,
            TimetableSession.status == "PUBLISHED",
        )
        .all()
    )
    for session in timetable_sessions:
        if _times_overlap(start_time, end_time, session.start_time, session.end_time):
            return {
                "has_conflict": True,
                "clash_detail": (
                    f"Academic session scheduled at "
                    f"{session.start_time.strftime('%H:%M')} — {session.end_time.strftime('%H:%M')} "
                    f"on this venue for this day."
                ),
            }

    # Check existing approved events
    from app.models.event import Event
    events_query = db.query(Event).filter(
        Event.resource_id == resource_id,
        Event.event_date == event_date,
    )
    if exclude_event_id:
        events_query = events_query.filter(Event.event_id != exclude_event_id)

    for event in events_query.all():
        ev_start = event.start_time.time() if isinstance(event.start_time, datetime.datetime) else event.start_time
        ev_end = event.end_time.time() if isinstance(event.end_time, datetime.datetime) else event.end_time
        if _times_overlap(start_time, end_time, ev_start, ev_end):
            return {
                "has_conflict": True,
                "clash_detail": (
                    f"Venue already booked for '{event.event_name}' "
                    f"at {ev_start.strftime('%H:%M')} — {ev_end.strftime('%H:%M')}"
                ),
            }

    return {"has_conflict": False, "clash_detail": None}


# ---------------------------------------------------------------------------
# DIRECT VEHICLE CONFLICT CHECK (for Admin/Resource Manager direct-add)
# ---------------------------------------------------------------------------

def check_direct_vehicle(
    db: Session,
    assigned_vehicle_id: int,
    trip_date: datetime.date,
    start_time: datetime.time,
    end_time: datetime.time,
    exclude_req_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Check if a direct vehicle booking has conflicts.

    Returns:
      {
        "has_conflict": bool,
        "clash_detail": str | None
      }
    """
    conflicting_query = (
        db.query(VehicleRequest)
        .filter(
            VehicleRequest.assigned_vehicle_id == assigned_vehicle_id,
            VehicleRequest.trip_date == trip_date,
            VehicleRequest.status == RequestStatus.APPROVED,
        )
    )
    if exclude_req_id:
        conflicting_query = conflicting_query.filter(VehicleRequest.req_id != exclude_req_id)

    for vr in conflicting_query.all():
        if vr.start_time and vr.end_time:
            if _times_overlap(start_time, end_time, vr.start_time, vr.end_time):
                return {
                    "has_conflict": True,
                    "clash_detail": (
                        f"Vehicle is already assigned to a request "
                        f"from {vr.start_time.strftime('%H:%M')} — {vr.end_time.strftime('%H:%M')}"
                    ),
                }

    return {"has_conflict": False, "clash_detail": None}

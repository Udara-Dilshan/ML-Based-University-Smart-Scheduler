"""
Booking Requests Router
=======================
Handles event/venue requests and vehicle requests.

Access control:
  - Lecturers: submit requests, view their own requests
  - Resource Managers: view all requests, approve/reject
  - Super Admin: same as Resource Manager + direct event creation
  - Students: NOT allowed (read-only portal)
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.event import Event, EventRequest, RequestStatus, VehicleRequest
from app.models.resource import Resource
from app.models.event import Vehicle
from app.models.user import User, UserRole
from app.utils.dependencies import get_current_user, require_roles, _normalize_role
from app.services.booking_ai import (
    check_event_request,
    check_vehicle_request,
    check_direct_event,
)

router = APIRouter(prefix="/booking-requests", tags=["booking-requests"])

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _require_lecturer_or_manager(current_user: User = Depends(get_current_user)) -> User:
    allowed = {UserRole.LECTURER.value, UserRole.RESOURCE_MANAGER.value, UserRole.SUPER_ADMIN.value}
    role = _normalize_role(current_user.role)
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return current_user


def _require_manager(current_user: User = Depends(get_current_user)) -> User:
    allowed = {UserRole.RESOURCE_MANAGER.value, UserRole.SUPER_ADMIN.value}
    role = _normalize_role(current_user.role)
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return current_user


def _require_lecturer(current_user: User = Depends(get_current_user)) -> User:
    allowed = {UserRole.LECTURER.value}
    role = _normalize_role(current_user.role)
    if role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Lecturers can submit requests")
    return current_user


def _serialize_event_request(req: EventRequest, ai_result: Optional[Dict] = None) -> Dict[str, Any]:
    requester = req.requester
    resource = req.resource
    allocated = req.allocated_resource

    result = {
        "req_id": req.req_id,
        "requested_by_user_id": req.requested_by_user_id,
        "requester_name": f"{requester.first_name} {requester.last_name}" if requester else "Unknown",
        "requester_email": requester.email if requester else None,
        "resource_id": req.resource_id,
        "resource_name": resource.name if resource else None,
        "resource_capacity": resource.capacity if resource else None,
        "resource_type": resource.type if resource else None,
        "event_name": req.event_name,
        "event_date": req.event_date.isoformat() if req.event_date else None,
        "start_time": req.start_time.strftime("%H:%M") if req.start_time else None,
        "end_time": req.end_time.strftime("%H:%M") if req.end_time else None,
        "participant_count": req.participant_count,
        "purpose": req.purpose,
        "status": req.status.value if req.status else "PENDING",
        "rejection_reason": req.rejection_reason,
        "allocated_resource_id": req.allocated_resource_id,
        "allocated_resource_name": allocated.name if allocated else None,
    }
    if ai_result:
        result["ai_status"] = ai_result.get("ai_status", "CLEAR")
        result["ai_clash_detail"] = ai_result.get("clash_detail")
        result["ai_alternatives"] = ai_result.get("alternatives", [])
    return result


def _serialize_vehicle_request(req: VehicleRequest, ai_result: Optional[Dict] = None) -> Dict[str, Any]:
    requester = req.requester
    vehicle = req.vehicle

    result = {
        "req_id": req.req_id,
        "requested_by_user_id": req.requested_by_user_id,
        "requester_name": f"{requester.first_name} {requester.last_name}" if requester else "Unknown",
        "requester_email": requester.email if requester else None,
        "vehicle_type_needed": req.vehicle_type_needed,
        "passenger_count": req.passenger_count,
        "trip_date": req.trip_date.isoformat() if req.trip_date else None,
        "start_time": req.start_time.strftime("%H:%M") if req.start_time else None,
        "end_time": req.end_time.strftime("%H:%M") if req.end_time else None,
        "destination": req.destination,
        "purpose": req.purpose,
        "status": req.status.value if req.status else "PENDING",
        "assigned_vehicle_id": req.assigned_vehicle_id,
        "assigned_vehicle_reg": vehicle.reg_number if vehicle else None,
        "rejection_reason": req.rejection_reason,
    }
    if ai_result:
        result["ai_status"] = ai_result.get("ai_status", "CLEAR")
        result["ai_clash_detail"] = ai_result.get("clash_detail")
        result["ai_available_vehicles"] = ai_result.get("available_vehicles", [])
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class EventRequestCreate(BaseModel):
    resource_id: int
    event_name: str = Field(min_length=1, max_length=150)
    event_date: datetime.date
    start_time: datetime.time
    end_time: datetime.time
    participant_count: int = Field(gt=0)
    purpose: Optional[str] = None


class EventRequestApprove(BaseModel):
    allocated_resource_id: Optional[int] = None  # If approving with alternative venue


class EventRequestReject(BaseModel):
    rejection_reason: str = Field(min_length=1)


class VehicleRequestCreate(BaseModel):
    vehicle_type_needed: str = Field(min_length=1, max_length=50)
    passenger_count: int = Field(gt=0)
    trip_date: datetime.date
    start_time: datetime.time
    end_time: datetime.time
    destination: Optional[str] = None
    purpose: Optional[str] = None


class VehicleRequestApprove(BaseModel):
    assigned_vehicle_id: int


class VehicleRequestReject(BaseModel):
    rejection_reason: str = Field(min_length=1)


class DirectEventCreate(BaseModel):
    resource_id: int
    event_name: str = Field(min_length=1, max_length=150)
    event_date: datetime.date
    start_time: datetime.time
    end_time: datetime.time
    description: Optional[str] = None
    event_type: Optional[str] = None   # "Academic", "Sports", "Cultural", etc.


# ─────────────────────────────────────────────────────────────────────────────
# EVENT REQUESTS — Lecturer submits
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/events", status_code=status.HTTP_201_CREATED)
def submit_event_request(
    payload: EventRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_lecturer),
):
    """Lecturer submits a venue/event request."""
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=422, detail="start_time must be before end_time")

    resource = db.query(Resource).filter(Resource.resource_id == payload.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    req = EventRequest(
        requested_by_user_id=current_user.user_id,
        resource_id=payload.resource_id,
        event_name=payload.event_name.strip(),
        event_date=payload.event_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        participant_count=payload.participant_count,
        purpose=(payload.purpose or "").strip() or None,
        status=RequestStatus.PENDING,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialize_event_request(req)


@router.get("/events/my")
def get_my_event_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_lecturer_or_manager),
):
    """Lecturer views their own submitted event requests."""
    reqs = (
        db.query(EventRequest)
        .filter(EventRequest.requested_by_user_id == current_user.user_id)
        .order_by(EventRequest.req_id.desc())
        .all()
    )
    return [_serialize_event_request(r) for r in reqs]


@router.get("/events")
def list_event_requests(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """Resource Manager views all event requests with AI pre-processing."""
    query = db.query(EventRequest).order_by(EventRequest.req_id.desc())
    if status_filter:
        try:
            query = query.filter(EventRequest.status == RequestStatus(status_filter.upper()))
        except ValueError:
            pass

    reqs = query.all()
    results = []
    for req in reqs:
        ai = check_event_request(db, req) if req.status == RequestStatus.PENDING else None
        results.append(_serialize_event_request(req, ai))
    return results


@router.get("/events/{req_id}")
def get_event_request(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """Get a single event request with fresh AI check."""
    req = db.query(EventRequest).filter(EventRequest.req_id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Event request not found")
    ai = check_event_request(db, req) if req.status == RequestStatus.PENDING else None
    return _serialize_event_request(req, ai)


@router.put("/events/{req_id}/approve")
def approve_event_request(
    req_id: int,
    payload: EventRequestApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """
    Approve an event request.
    If allocated_resource_id is provided, that alternative venue is used.
    Creates an entry in the events table.
    """
    req = db.query(EventRequest).filter(EventRequest.req_id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Event request not found")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=409, detail="Request is already processed")

    actual_resource_id = payload.allocated_resource_id or req.resource_id
    actual_resource = db.query(Resource).filter(Resource.resource_id == actual_resource_id).first()
    if not actual_resource:
        raise HTTPException(status_code=404, detail="Allocated resource not found")

    # Update request
    req.status = RequestStatus.APPROVED
    req.allocated_resource_id = actual_resource_id

    # Create approved Event record
    start_dt = datetime.datetime.combine(req.event_date, req.start_time)
    end_dt = datetime.datetime.combine(req.event_date, req.end_time)
    event = Event(
        resource_id=actual_resource_id,
        organizer_user_id=req.requested_by_user_id,
        event_name=req.event_name,
        event_date=req.event_date,
        start_time=start_dt,
        end_time=end_dt,
        description=req.purpose,
        event_type="Academic",
        status=RequestStatus.APPROVED,
        source_request_id=req.req_id,
    )
    db.add(event)
    db.commit()
    db.refresh(req)
    return _serialize_event_request(req)


@router.put("/events/{req_id}/reject")
def reject_event_request(
    req_id: int,
    payload: EventRequestReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    req = db.query(EventRequest).filter(EventRequest.req_id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Event request not found")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=409, detail="Request is already processed")

    req.status = RequestStatus.REJECTED
    req.rejection_reason = payload.rejection_reason
    db.commit()
    db.refresh(req)
    return _serialize_event_request(req)


# ─────────────────────────────────────────────────────────────────────────────
# VEHICLE REQUESTS — Lecturer submits
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
def submit_vehicle_request(
    payload: VehicleRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_lecturer),
):
    """Lecturer submits a vehicle request."""
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=422, detail="start_time must be before end_time")

    req = VehicleRequest(
        requested_by_user_id=current_user.user_id,
        vehicle_type_needed=payload.vehicle_type_needed.strip(),
        passenger_count=payload.passenger_count,
        trip_date=payload.trip_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        destination=(payload.destination or "").strip() or None,
        purpose=(payload.purpose or "").strip() or None,
        status=RequestStatus.PENDING,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialize_vehicle_request(req)


@router.get("/vehicles/my")
def get_my_vehicle_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_lecturer_or_manager),
):
    """Lecturer views their own submitted vehicle requests."""
    reqs = (
        db.query(VehicleRequest)
        .filter(VehicleRequest.requested_by_user_id == current_user.user_id)
        .order_by(VehicleRequest.req_id.desc())
        .all()
    )
    return [_serialize_vehicle_request(r) for r in reqs]


@router.get("/vehicles")
def list_vehicle_requests(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """Resource Manager views all vehicle requests with AI pre-processing."""
    query = db.query(VehicleRequest).order_by(VehicleRequest.req_id.desc())
    if status_filter:
        try:
            query = query.filter(VehicleRequest.status == RequestStatus(status_filter.upper()))
        except ValueError:
            pass

    reqs = query.all()
    results = []
    for req in reqs:
        ai = check_vehicle_request(db, req) if req.status == RequestStatus.PENDING else None
        results.append(_serialize_vehicle_request(req, ai))
    return results


@router.get("/vehicles/{req_id}")
def get_vehicle_request(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    req = db.query(VehicleRequest).filter(VehicleRequest.req_id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Vehicle request not found")
    ai = check_vehicle_request(db, req) if req.status == RequestStatus.PENDING else None
    return _serialize_vehicle_request(req, ai)


@router.put("/vehicles/{req_id}/approve")
def approve_vehicle_request(
    req_id: int,
    payload: VehicleRequestApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """Assign a specific vehicle and approve the request."""
    req = db.query(VehicleRequest).filter(VehicleRequest.req_id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Vehicle request not found")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=409, detail="Request is already processed")

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == payload.assigned_vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if not vehicle.is_available:
        raise HTTPException(status_code=409, detail="Selected vehicle is marked as Unavailable")

    req.status = RequestStatus.APPROVED
    req.assigned_vehicle_id = payload.assigned_vehicle_id
    db.commit()
    db.refresh(req)
    return _serialize_vehicle_request(req)


@router.put("/vehicles/{req_id}/reject")
def reject_vehicle_request(
    req_id: int,
    payload: VehicleRequestReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    req = db.query(VehicleRequest).filter(VehicleRequest.req_id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Vehicle request not found")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=409, detail="Request is already processed")

    req.status = RequestStatus.REJECTED
    req.rejection_reason = payload.rejection_reason
    db.commit()
    db.refresh(req)
    return _serialize_vehicle_request(req)


# ─────────────────────────────────────────────────────────────────────────────
# DIRECT EVENT MANAGEMENT — Resource Manager / Admin
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/events-list")
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Public-ish: list all approved events (for student campus events page)."""
    events = (
        db.query(Event)
        .filter(Event.status == RequestStatus.APPROVED)
        .order_by(Event.event_date.asc(), Event.start_time.asc())
        .all()
    )
    result = []
    for e in events:
        resource = e.resource
        organizer = e.organizer
        result.append({
            "event_id": e.event_id,
            "event_name": e.event_name,
            "event_date": e.event_date.isoformat() if e.event_date else None,
            "start_time": e.start_time.strftime("%H:%M") if e.start_time else None,
            "end_time": e.end_time.strftime("%H:%M") if e.end_time else None,
            "description": e.description,
            "event_type": e.event_type,
            "resource_id": e.resource_id,
            "venue_name": resource.name if resource else None,
            "venue_location": resource.location if resource else None,
            "organizer_name": (
                f"{organizer.first_name} {organizer.last_name}" if organizer else "University"
            ),
        })
    return result


@router.post("/direct-events", status_code=status.HTTP_201_CREATED)
def create_direct_event(
    payload: DirectEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """
    Resource Manager / Admin directly creates an approved event.
    AI conflict check runs first — if clash exists, returns 409.
    """
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=422, detail="start_time must be before end_time")

    resource = db.query(Resource).filter(Resource.resource_id == payload.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    conflict = check_direct_event(
        db=db,
        resource_id=payload.resource_id,
        event_date=payload.event_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    if conflict["has_conflict"]:
        raise HTTPException(
            status_code=409,
            detail=f"Conflict detected: {conflict['clash_detail']}",
        )

    start_dt = datetime.datetime.combine(payload.event_date, payload.start_time)
    end_dt = datetime.datetime.combine(payload.event_date, payload.end_time)

    event = Event(
        resource_id=payload.resource_id,
        organizer_user_id=current_user.user_id,
        event_name=payload.event_name.strip(),
        event_date=payload.event_date,
        start_time=start_dt,
        end_time=end_dt,
        description=(payload.description or "").strip() or None,
        event_type=(payload.event_type or "General").strip(),
        status=RequestStatus.APPROVED,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    r = event.resource
    return {
        "event_id": event.event_id,
        "event_name": event.event_name,
        "event_date": event.event_date.isoformat(),
        "start_time": event.start_time.strftime("%H:%M"),
        "end_time": event.end_time.strftime("%H:%M"),
        "description": event.description,
        "event_type": event.event_type,
        "venue_name": r.name if r else None,
    }


@router.get("/direct-events")
def list_direct_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """Resource Manager lists all events (including direct + approved requests)."""
    events = (
        db.query(Event)
        .order_by(Event.event_date.desc(), Event.start_time.desc())
        .all()
    )
    result = []
    for e in events:
        resource = e.resource
        organizer = e.organizer
        result.append({
            "event_id": e.event_id,
            "event_name": e.event_name,
            "event_date": e.event_date.isoformat() if e.event_date else None,
            "start_time": e.start_time.strftime("%H:%M") if e.start_time else None,
            "end_time": e.end_time.strftime("%H:%M") if e.end_time else None,
            "description": e.description,
            "event_type": e.event_type,
            "resource_id": e.resource_id,
            "venue_name": resource.name if resource else None,
            "organizer_name": (
                f"{organizer.first_name} {organizer.last_name}" if organizer else "University"
            ),
            "source_request_id": e.source_request_id,
        })
    return result


@router.put("/direct-events/{event_id}", status_code=status.HTTP_200_OK)
def update_direct_event(
    event_id: int,
    payload: DirectEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """
    Resource Manager / Admin updates an approved event.
    AI conflict check runs first, excluding this event.
    """
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=422, detail="start_time must be before end_time")

    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    resource = db.query(Resource).filter(Resource.resource_id == payload.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    conflict = check_direct_event(
        db=db,
        resource_id=payload.resource_id,
        event_date=payload.event_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        exclude_event_id=event_id,
    )
    if conflict["has_conflict"]:
        raise HTTPException(
            status_code=409,
            detail=f"Conflict detected: {conflict['clash_detail']}",
        )

    start_dt = datetime.datetime.combine(payload.event_date, payload.start_time)
    end_dt = datetime.datetime.combine(payload.event_date, payload.end_time)

    event.resource_id = payload.resource_id
    event.event_name = payload.event_name.strip()
    event.event_date = payload.event_date
    event.start_time = start_dt
    event.end_time = end_dt
    event.description = (payload.description or "").strip() or None
    event.event_type = (payload.event_type or "General").strip()
    
    db.commit()
    db.refresh(event)

    r = event.resource
    return {
        "event_id": event.event_id,
        "event_name": event.event_name,
        "event_date": event.event_date.isoformat(),
        "start_time": event.start_time.strftime("%H:%M"),
        "end_time": event.end_time.strftime("%H:%M"),
        "description": event.description,
        "event_type": event.event_type,
        "venue_name": r.name if r else None,
    }


@router.delete("/direct-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_direct_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """Delete an approved event (both direct and approved-request-originated)."""
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY (for dashboard badges)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_booking_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_manager),
):
    """Dashboard summary counts for the Resource Manager."""
    pending_events = (
        db.query(EventRequest)
        .filter(EventRequest.status == RequestStatus.PENDING)
        .count()
    )
    pending_vehicles = (
        db.query(VehicleRequest)
        .filter(VehicleRequest.status == RequestStatus.PENDING)
        .count()
    )
    return {
        "pending_event_requests": pending_events,
        "pending_vehicle_requests": pending_vehicles,
    }

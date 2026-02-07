"""
Models Package - Import all models here for Alembic auto-detection
"""
from app.database import Base

# Import all models to ensure they are registered with SQLAlchemy
from app.models.user import User, UserRole
from app.models.academic import Faculty, Department, Degree, Batch, Module
from app.models.profile import Lecturer, Student, ResourceManager, ResourceSection
from app.models.resource import Resource, ResourceType
from app.models.scheduling import (
    SystemConstraint,
    LecturerAvailability,
    TimetableSession,
    ConstraintType,
    SessionType,
    SessionStatus
)
from app.models.event import Vehicle, VehicleRequest, Event, RequestStatus
from app.models.audit import AuditLog

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Faculty",
    "Department",
    "Degree",
    "Batch",
    "Module",
    "Lecturer",
    "Student",
    "ResourceManager",
    "ResourceSection",
    "Resource",
    "ResourceType",
    "SystemConstraint",
    "LecturerAvailability",
    "TimetableSession",
    "ConstraintType",
    "SessionType",
    "SessionStatus",
    "Vehicle",
    "VehicleRequest",
    "Event",
    "RequestStatus",
    "AuditLog",
]

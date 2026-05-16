"""
Scheduling Models - re-exports canonical definitions to avoid MetaData conflicts.
The actual ORM classes live in settings.py, lecturer_availability.py, and timetable.py.
"""
from app.models.settings import SystemConstraint  # noqa: F401
from app.models.lecturer_availability import LecturerAvailability  # noqa: F401
from app.models.timetable import TimetableSession  # noqa: F401

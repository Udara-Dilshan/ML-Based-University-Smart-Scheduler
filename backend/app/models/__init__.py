from app.database.connection import Base
from .user import User
from .profiles import Student, Lecturer, ResourceManager, SchedulerProfile
from .academic import Faculty, Department, Module, Degree, Batch, DegreeSemesterModule, BatchActiveTerm, LecturerModuleAssignment
from .resource import Resource, resource_departments
from .settings import SystemConstraint, SystemSetting
from .event import Event, Vehicle, VehicleRequest, EventRequest
from .audit import AuditLog
from .timetable import TimetableSession
from .medical import MedicalSubmission
from .notification import Notification

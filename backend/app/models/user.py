import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import relationship
from ..database.connection import Base

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SuperAdmin"
    SCHEDULER = "Scheduler"
    LECTURER = "Lecturer"
    STUDENT = "Student"
    RESOURCE_MANAGER = "ResourceManager"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    role = Column(
        Enum("SUPER_ADMIN", "SCHEDULER", "LECTURER", "STUDENT", "RESOURCE_MANAGER", name="userrole"),
        nullable=False,
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    contact_number = Column(String(15), nullable=True)
    profile_image = Column(String(255), nullable=True)

    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    lecturer_profile = relationship("Lecturer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resource_manager_profile = relationship("ResourceManager", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    vehicle_requests = relationship("VehicleRequest", back_populates="requester")
    events = relationship("Event", back_populates="organizer")

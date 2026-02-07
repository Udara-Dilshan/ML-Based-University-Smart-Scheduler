"""
User Model - Centralized user table with role-based access
"""
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    """User role enumeration"""
    SUPER_ADMIN = "SuperAdmin"
    SCHEDULER = "Scheduler"
    LECTURER = "Lecturer"
    STUDENT = "Student"
    RESOURCE_MANAGER = "ResourceManager"

class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    contact_number = Column(String(15), nullable=True)
    profile_image = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    lecturer_profile = relationship("Lecturer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resource_manager_profile = relationship("ResourceManager", back_populates="user", uselist=False, cascade="all, delete-orphan")
    vehicle_requests = relationship("VehicleRequest", back_populates="requester")
    events = relationship("Event", back_populates="organizer")

    def __repr__(self):
        return f"<User {self.email} - {self.role}>"

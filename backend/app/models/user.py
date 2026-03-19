import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
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
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    contact_number = Column(String(20), nullable=True)
    profile_image = Column(String(255), nullable=True)

    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    lecturer_profile = relationship("Lecturer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resource_manager_profile = relationship("ResourceManager", back_populates="user", uselist=False, cascade="all, delete-orphan")

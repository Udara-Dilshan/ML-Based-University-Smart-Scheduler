"""
User Profile Models - Lecturer, Student, Resource Manager
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class ResourceSection(str, enum.Enum):
    """Resource manager section enumeration"""
    TRANSPORT = "Transport"
    EVENTS = "Events"
    GENERAL = "General"

class Lecturer(Base):
    """Lecturer profile model"""
    __tablename__ = "lecturers"

    lecturer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id", ondelete="CASCADE"), nullable=False)
    staff_id = Column(String(50), nullable=True)

    # Relationships
    user = relationship("User", back_populates="lecturer_profile")
    department = relationship("Department", back_populates="lecturers")
    availability = relationship("LecturerAvailability", back_populates="lecturer", cascade="all, delete-orphan")
    timetable_sessions = relationship("TimetableSession", back_populates="lecturer")

    def __repr__(self):
        return f"<Lecturer {self.staff_id}>"


class Student(Base):
    """Student profile model"""
    __tablename__ = "students"

    student_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), nullable=False)
    reg_no = Column(String(50), nullable=False, unique=True)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    batch = relationship("Batch", back_populates="students")

    def __repr__(self):
        return f"<Student {self.reg_no}>"


class ResourceManager(Base):
    """Resource manager profile model"""
    __tablename__ = "resource_managers"

    manager_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    assigned_section = Column(Enum(ResourceSection), nullable=True)

    # Relationships
    user = relationship("User", back_populates="resource_manager_profile")

    def __repr__(self):
        return f"<ResourceManager {self.assigned_section}>"

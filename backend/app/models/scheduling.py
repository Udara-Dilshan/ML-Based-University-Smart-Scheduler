"""
Scheduling Models - Timetable, Constraints, Availability
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Time, Text
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class ConstraintType(str, enum.Enum):
    """Constraint type enumeration"""
    HARD = "Hard"
    SOFT = "Soft"

class SessionType(str, enum.Enum):
    """Session type enumeration"""
    LECTURE = "Lecture"
    PRACTICAL = "Practical"

class SessionStatus(str, enum.Enum):
    """Session status enumeration"""
    DRAFT = "Draft"
    PUBLISHED = "Published"

class SystemConstraint(Base):
    """System constraint model for scheduling rules"""
    __tablename__ = "system_constraints"

    constraint_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    value = Column(Integer, nullable=False)
    type = Column(Enum(ConstraintType), nullable=False)

    def __repr__(self):
        return f"<Constraint {self.name} - {self.type}>"


class LecturerAvailability(Base):
    """Lecturer availability model"""
    __tablename__ = "lecturer_availability"

    avail_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lecturer_id = Column(Integer, ForeignKey("lecturers.lecturer_id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String(20), nullable=False)
    unavailable_start = Column(Time, nullable=False)
    unavailable_end = Column(Time, nullable=False)
    reason = Column(String(255), nullable=True)

    # Relationships
    lecturer = relationship("Lecturer", back_populates="availability")

    def __repr__(self):
        return f"<LecturerAvailability {self.lecturer_id} - {self.day_of_week}>"


class TimetableSession(Base):
    """Timetable session model"""
    __tablename__ = "timetable_sessions"

    session_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), nullable=False)
    lecturer_id = Column(Integer, ForeignKey("lecturers.lecturer_id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.resource_id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    type = Column(Enum(SessionType), nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.DRAFT)

    # Relationships
    module = relationship("Module", back_populates="timetable_sessions")
    lecturer = relationship("Lecturer", back_populates="timetable_sessions")
    resource = relationship("Resource", back_populates="timetable_sessions")
    batch = relationship("Batch", back_populates="timetable_sessions")

    def __repr__(self):
        return f"<Session {self.day_of_week} {self.start_time}-{self.end_time}>"

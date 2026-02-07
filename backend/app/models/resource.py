"""
Resource Models - Lecture Halls, Labs, Auditoriums
"""
from sqlalchemy import Column, Integer, String, Boolean, Enum, Text
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class ResourceType(str, enum.Enum):
    """Resource type enumeration"""
    LECTURE_HALL = "LectureHall"
    LAB = "Lab"
    AUDITORIUM = "Auditorium"
    GROUND = "Ground"

class Resource(Base):
    """Resource model for halls, labs, auditoriums, grounds"""
    __tablename__ = "resources"

    resource_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    type = Column(Enum(ResourceType), nullable=False)
    capacity = Column(Integer, nullable=False)
    facilities = Column(Text, nullable=True)
    building = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    timetable_sessions = relationship("TimetableSession", back_populates="resource")
    events = relationship("Event", back_populates="resource")

    def __repr__(self):
        return f"<Resource {self.name} - {self.type}>"

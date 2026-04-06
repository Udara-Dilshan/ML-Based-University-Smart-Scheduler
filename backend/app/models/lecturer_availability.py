from sqlalchemy import Column, Integer, String, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.database.connection import Base

class LecturerAvailability(Base):
    __tablename__ = "lecturer_availability"

    avail_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lecturer_id = Column(Integer, ForeignKey("lecturers.lecturer_id"))
    day_of_week = Column(String(20), nullable=False)
    unavailable_start = Column(Time, nullable=False)
    unavailable_end = Column(Time, nullable=False)
    reason = Column(String(255), nullable=True)

    lecturer = relationship("Lecturer")
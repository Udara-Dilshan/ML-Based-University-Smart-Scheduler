from sqlalchemy import Column, Integer, String, ForeignKey, Time, Enum
from sqlalchemy.orm import relationship
from app.database.connection import Base

class TimetableSession(Base):
    __tablename__ = "timetable_sessions"

    session_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.module_id"), nullable=False)
    lecturer_id = Column(Integer, ForeignKey("lecturers.lecturer_id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.resource_id"), nullable=False)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    type = Column(Enum("LECTURE", "PRACTICAL", name="sessiontype"), nullable=False, default="LECTURE")
    status = Column(Enum("DRAFT", "PUBLISHED", name="sessionstatus"), nullable=True, default="DRAFT")

    batch = relationship("Batch")
    module = relationship("Module")
    lecturer = relationship("Lecturer")
    resource = relationship("Resource")
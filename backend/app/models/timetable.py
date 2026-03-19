from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class TimetableSession(Base):
    __tablename__ = "timetable_sessions"

    session_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id"))
    module_id = Column(Integer, ForeignKey("modules.module_id"))
    lecturer_id = Column(Integer, ForeignKey("users.user_id"))
    resource_id = Column(Integer, ForeignKey("resources.resource_id"))
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)

    batch = relationship("Batch")
    module = relationship("Module")
    lecturer = relationship("User")
    resource = relationship("Resource")
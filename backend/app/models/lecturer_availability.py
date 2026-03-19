from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class LecturerAvailability(Base):
    __tablename__ = "lecturer_availability"

    avail_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lecturer_id = Column(Integer, ForeignKey("users.user_id"))
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)

    lecturer = relationship("User")
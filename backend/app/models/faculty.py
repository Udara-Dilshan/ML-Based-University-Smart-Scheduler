from sqlalchemy import Column, Integer, String
from app.database.connection import Base

class Faculty(Base):
    __tablename__ = "faculties"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    dean = Column(String(255), nullable=False)
    status = Column(String(50), default="Active")
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import synonym
from ..database.connection import Base

class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(50), nullable=False)
    capacity = Column(Integer, nullable=False)
    facilities = Column(String(255), nullable=True)
    building = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    location = synonym("building")
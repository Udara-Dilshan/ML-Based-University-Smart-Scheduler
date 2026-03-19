from sqlalchemy import Column, Integer, String, Enum
from ..database.connection import Base

class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    location = Column(String(255), nullable=True)
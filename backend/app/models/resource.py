from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import synonym, relationship
from ..database.connection import Base


resource_departments = Table(
    "resource_departments",
    Base.metadata,
    Column("resource_id", Integer, ForeignKey("resources.resource_id", ondelete="CASCADE"), primary_key=True),
    Column("dept_id", Integer, ForeignKey("departments.dept_id", ondelete="CASCADE"), primary_key=True),
)

class Resource(Base):
    __tablename__ = "resources"

    resource_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(50), nullable=False)
    capacity = Column(Integer, nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.faculty_id"), nullable=False)
    dept_id = Column(Integer, ForeignKey("departments.dept_id"), nullable=True, index=True)
    facilities = Column(String(255), nullable=True)
    building = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    location = synonym("building")
    faculty = relationship("Faculty")
    department = relationship("Department")
    departments = relationship("Department", secondary=resource_departments)
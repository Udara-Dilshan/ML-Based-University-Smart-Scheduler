from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Faculty(Base):
    __tablename__ = "faculties"
    faculty_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    departments = relationship("Department", back_populates="faculty", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"
    dept_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    faculty_id = Column(Integer, ForeignKey("faculties.faculty_id"))
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    faculty = relationship("Faculty", back_populates="departments")
    modules = relationship("Module", back_populates="department", cascade="all, delete-orphan")

class Module(Base):
    __tablename__ = "modules"
    module_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id"))
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    credits = Column(Integer, default=2)
    department = relationship("Department", back_populates="modules")


class Degree(Base):
    __tablename__ = "degrees"
    degree_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    duration_years = Column(Integer, default=4)


class Batch(Base):
    __tablename__ = "batches"
    batch_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id"), nullable=True)
    name = Column(String(100), nullable=False)
    academic_year = Column(String(20), nullable=False)
    department = relationship("Department")

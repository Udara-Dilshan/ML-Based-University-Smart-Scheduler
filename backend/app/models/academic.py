from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, synonym
from app.database.connection import Base

class Faculty(Base):
    __tablename__ = "faculties"
    faculty_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    dean_name = Column(String(100), nullable=True)
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
    degree_id = Column(Integer, ForeignKey("degrees.degree_id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.batch_id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    credits = Column(Integer, nullable=False)
    lecture_hours_per_week = Column(Integer, nullable=False)
    is_active = Column(Integer, nullable=True, default=1)
    department = relationship("Department", back_populates="modules")


class Degree(Base):
    __tablename__ = "degrees"
    degree_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    duration_years = Column(Integer, nullable=False)
    department = relationship("Department")
    batches = relationship("Batch", back_populates="degree", cascade="all, delete-orphan")


class Batch(Base):
    __tablename__ = "batches"
    batch_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    degree_id = Column(Integer, ForeignKey("degrees.degree_id"), nullable=False)
    batch_code = Column(String(50), nullable=False)
    student_count = Column(Integer, nullable=False)
    current_semester = Column(Integer, nullable=False)
    dept_id = synonym("degree_id")
    name = synonym("batch_code")
    academic_year = synonym("current_semester")
    degree = relationship("Degree", back_populates="batches")

    @property
    def department(self):
        return self.degree

"""
Academic Structure Models - Faculties, Departments, Degrees, Batches, Modules
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Faculty(Base):
    """Faculty model"""
    __tablename__ = "faculties"

    faculty_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    dean_name = Column(String(100), nullable=True)

    # Relationships
    departments = relationship("Department", back_populates="faculty", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Faculty {self.name}>"


class Department(Base):
    """Department model"""
    __tablename__ = "departments"

    dept_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    faculty_id = Column(Integer, ForeignKey("faculties.faculty_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)

    # Relationships
    faculty = relationship("Faculty", back_populates="departments")
    degrees = relationship("Degree", back_populates="department", cascade="all, delete-orphan")
    modules = relationship("Module", back_populates="department", cascade="all, delete-orphan")
    lecturers = relationship("Lecturer", back_populates="department")

    def __repr__(self):
        return f"<Department {self.name}>"


class Degree(Base):
    """Degree program model"""
    __tablename__ = "degrees"

    degree_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    duration_years = Column(Integer, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="degrees")
    batches = relationship("Batch", back_populates="degree", cascade="all, delete-orphan")
    modules = relationship("Module", back_populates="degree", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Degree {self.name}>"


class Batch(Base):
    """Student batch model"""
    __tablename__ = "batches"

    batch_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    degree_id = Column(Integer, ForeignKey("degrees.degree_id", ondelete="CASCADE"), nullable=False)
    batch_code = Column(String(50), nullable=False)  # e.g., "2021/2022"
    student_count = Column(Integer, nullable=False)
    current_semester = Column(Integer, nullable=False)

    # Relationships
    degree = relationship("Degree", back_populates="batches")
    students = relationship("Student", back_populates="batch")
    timetable_sessions = relationship("TimetableSession", back_populates="batch")

    def __repr__(self):
        return f"<Batch {self.batch_code}>"


class Module(Base):
    """Module/Subject model"""
    __tablename__ = "modules"

    module_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id", ondelete="CASCADE"), nullable=False)
    degree_id = Column(Integer, ForeignKey("degrees.degree_id", ondelete="CASCADE"), nullable=False)
    code = Column(String(20), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False)
    lecture_hours_per_week = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    department = relationship("Department", back_populates="modules")
    degree = relationship("Degree", back_populates="modules")
    timetable_sessions = relationship("TimetableSession", back_populates="module")

    def __repr__(self):
        return f"<Module {self.code} - {self.name}>"

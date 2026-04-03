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
    code = synonym("name")
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
    degree_id = Column(Integer, ForeignKey("degrees.degree_id"), nullable=True)
    batch_code = Column(String(50), nullable=False)
    student_count = Column(Integer, nullable=True)
    current_semester = Column(Integer, nullable=True)
    dept_id = synonym("degree_id")
    name = synonym("batch_code")
    academic_year = synonym("current_semester")

    @property
    def department(self):
        return None

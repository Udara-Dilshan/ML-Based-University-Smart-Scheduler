from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship, synonym
from app.database.connection import Base

class Faculty(Base):
    __tablename__ = "faculties"
    faculty_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(191), unique=True, nullable=False)
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
    __table_args__ = (
        UniqueConstraint("degree_id", "code", name="uq_modules_degree_code"),
        UniqueConstraint("degree_id", "name", name="uq_modules_degree_name"),
    )

    module_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id"))
    degree_id = Column(Integer, ForeignKey("degrees.degree_id"), nullable=False)
    name = Column(String(200), nullable=False)
    code = Column(String(50), nullable=False)
    credits = Column(Integer, nullable=False)
    lecture_hours_per_week = Column(Integer, nullable=False)
    is_active = Column(Integer, nullable=True, default=1)
    department = relationship("Department", back_populates="modules")
    degree_semester_mappings = relationship(
        "DegreeSemesterModule",
        back_populates="module",
        cascade="all, delete-orphan",
    )
    lecturer_assignments = relationship(
        "LecturerModuleAssignment",
        back_populates="module",
        cascade="all, delete-orphan",
    )


class Degree(Base):
    __tablename__ = "degrees"
    degree_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    duration_years = Column(Integer, nullable=False)
    department = relationship("Department")
    batches = relationship("Batch", back_populates="degree", cascade="all, delete-orphan")
    semester_modules = relationship(
        "DegreeSemesterModule",
        back_populates="degree",
        cascade="all, delete-orphan",
    )


class DegreeSemesterModule(Base):
    __tablename__ = "degree_semester_modules"
    __table_args__ = (
        UniqueConstraint(
            "degree_id",
            "semester_number",
            "module_id",
            name="uq_degree_semester_module",
        ),
        Index("ix_degree_semester_modules_degree_semester", "degree_id", "semester_number"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    degree_id = Column(Integer, ForeignKey("degrees.degree_id", ondelete="CASCADE"), nullable=False)
    semester_number = Column(Integer, nullable=False)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), nullable=False)

    degree = relationship("Degree", back_populates="semester_modules")
    module = relationship("Module", back_populates="degree_semester_mappings")


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
    active_terms = relationship("BatchActiveTerm", back_populates="batch", cascade="all, delete-orphan")
    lecturer_assignments = relationship(
        "LecturerModuleAssignment",
        back_populates="batch",
        cascade="all, delete-orphan",
    )

    @property
    def department(self):
        return self.degree


class BatchActiveTerm(Base):
    __tablename__ = "batch_active_terms"
    __table_args__ = (
        UniqueConstraint("batch_id", "semester_name", "academic_year", name="uq_batch_active_terms_history"),
        Index("ix_batch_active_terms_batch_active", "batch_id", "is_active"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), nullable=False)
    semester_name = Column(String(50), nullable=False)
    academic_year = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    batch = relationship("Batch", back_populates="active_terms")


class LecturerModuleAssignment(Base):
    __tablename__ = "lecturer_module_assignments"
    __table_args__ = (
        UniqueConstraint("batch_id", "module_id", name="uq_lecturer_module_assignments_batch_module"),
        Index("ix_lecturer_module_assignments_batch_id", "batch_id"),
        Index("ix_lecturer_module_assignments_lecturer_user_id", "lecturer_user_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.module_id", ondelete="CASCADE"), nullable=False)
    lecturer_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    batch = relationship("Batch", back_populates="lecturer_assignments")
    module = relationship("Module", back_populates="lecturer_assignments")
    lecturer = relationship("User")

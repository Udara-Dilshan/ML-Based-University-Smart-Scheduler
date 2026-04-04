from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database.connection import Base

class Student(Base):
    __tablename__ = "students"

    id = Column("student_id", Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True)
    index_number = Column("reg_no", String(50), unique=True, nullable=False)
    batch = Column("batch_id", Integer, nullable=True)

    @property
    def registration_number(self):
        return None

    @registration_number.setter
    def registration_number(self, value):
        return

    user = relationship("User", back_populates="student_profile")

class Lecturer(Base):
    __tablename__ = "lecturers"

    id = Column("lecturer_id", Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True)
    employee_id = Column("staff_id", String(50), unique=True, nullable=True)
    department = Column("dept_id", Integer, nullable=True)

    @property
    def designation(self):
        return None

    @designation.setter
    def designation(self, value):
        return

    user = relationship("User", back_populates="lecturer_profile")


class ResourceManager(Base):
    __tablename__ = "resource_managers"

    manager_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=False)
    assigned_section = Column(String(50), nullable=False)

    user = relationship("User", back_populates="resource_manager_profile")

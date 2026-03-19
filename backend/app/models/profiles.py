from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database.connection import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True)
    index_number = Column(String(50), unique=True, nullable=True)
    registration_number = Column(String(50), unique=True, nullable=True)
    batch = Column(String(50), nullable=True)

    user = relationship("User", back_populates="student_profile")

class Lecturer(Base):
    __tablename__ = "lecturers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True)
    employee_id = Column(String(50), unique=True, nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)

    user = relationship("User", back_populates="lecturer_profile")


class ResourceManager(Base):
    __tablename__ = "resource_managers"

    manager_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=False)
    assigned_section = Column(String(50), nullable=False)

    user = relationship("User", back_populates="resource_manager_profile")

import enum
from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class MedicalSubmissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class MedicalSubmission(Base):
    __tablename__ = "medical_submissions"

    submission_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="SET NULL"), nullable=True)
    degree_id = Column(Integer, ForeignKey("degrees.degree_id", ondelete="SET NULL"), nullable=True)
    dept_id = Column(Integer, ForeignKey("departments.dept_id", ondelete="SET NULL"), nullable=True)

    reason = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)

    document_path = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=True)
    document_size = Column(Integer, nullable=True)

    status = Column(Enum(MedicalSubmissionStatus), nullable=False, default=MedicalSubmissionStatus.PENDING)
    admin_comment = Column(Text, nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, onupdate=func.current_timestamp())

    student = relationship("User", foreign_keys=[student_user_id], back_populates="medical_submissions")
    reviewer = relationship("User", foreign_keys=[reviewed_by_user_id])
    batch = relationship("Batch")
    degree = relationship("Degree")
    department = relationship("Department")

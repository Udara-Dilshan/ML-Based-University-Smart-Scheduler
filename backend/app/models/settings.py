from sqlalchemy import Column, Integer, String, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.connection import Base


class SystemConstraint(Base):
    __tablename__ = "system_constraints"

    constraint_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    value = Column(Integer, nullable=False)
    type = Column(Enum("HARD", "SOFT", name="constrainttype"), nullable=False, default="HARD")
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="CASCADE"), nullable=True, index=True)

    batch = relationship("Batch")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(String(100), nullable=False, index=True)
    value = Column(String(255), nullable=False)

    __table_args__ = (
        UniqueConstraint("category", "value", name="uq_system_settings_category_value"),
    )

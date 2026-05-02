"""add_medical_submissions_table

Revision ID: b7d2c1e4a501
Revises: f4b2e8c7d9a1
Create Date: 2026-05-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7d2c1e4a501"
down_revision: Union[str, Sequence[str], None] = "f4b2e8c7d9a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "medical_submissions",
        sa.Column("submission_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_user_id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=True),
        sa.Column("degree_id", sa.Integer(), nullable=True),
        sa.Column("dept_id", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(length=50), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("document_path", sa.String(length=255), nullable=False),
        sa.Column("document_type", sa.String(length=50), nullable=True),
        sa.Column("document_size", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("PENDING", "APPROVED", "REJECTED", name="medicalsubmissionstatus"),
            nullable=False,
        ),
        sa.Column("admin_comment", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["batch_id"], ["batches.batch_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["degree_id"], ["degrees.degree_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["dept_id"], ["departments.dept_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["student_user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("submission_id"),
    )
    op.create_index(
        "ix_medical_submissions_student_user_id",
        "medical_submissions",
        ["student_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_medical_submissions_status",
        "medical_submissions",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_medical_submissions_created_at",
        "medical_submissions",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_medical_submissions_created_at", table_name="medical_submissions")
    op.drop_index("ix_medical_submissions_status", table_name="medical_submissions")
    op.drop_index("ix_medical_submissions_student_user_id", table_name="medical_submissions")
    op.drop_table("medical_submissions")

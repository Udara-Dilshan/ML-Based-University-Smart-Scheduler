"""add_degree_semester_modules_table

Revision ID: 1f7c9e4b2a10
Revises: f4b2e8c7d9a1
Create Date: 2026-04-06 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1f7c9e4b2a10"
down_revision: Union[str, Sequence[str], None] = "f4b2e8c7d9a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "degree_semester_modules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("degree_id", sa.Integer(), nullable=False),
        sa.Column("semester_number", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["degree_id"], ["degrees.degree_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["module_id"], ["modules.module_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("degree_id", "semester_number", "module_id", name="uq_degree_semester_module"),
    )
    op.create_index("ix_degree_semester_modules_id", "degree_semester_modules", ["id"], unique=False)
    op.create_index(
        "ix_degree_semester_modules_degree_semester",
        "degree_semester_modules",
        ["degree_id", "semester_number"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_degree_semester_modules_degree_semester", table_name="degree_semester_modules")
    op.drop_index("ix_degree_semester_modules_id", table_name="degree_semester_modules")
    op.drop_table("degree_semester_modules")

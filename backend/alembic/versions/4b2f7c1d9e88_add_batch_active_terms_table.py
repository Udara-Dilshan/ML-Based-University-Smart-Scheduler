"""add_batch_active_terms_table

Revision ID: 4b2f7c1d9e88
Revises: 1f7c9e4b2a10
Create Date: 2026-04-06 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b2f7c1d9e88"
down_revision: Union[str, Sequence[str], None] = "1f7c9e4b2a10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tables = set(inspector.get_table_names())
    if "batch_active_terms" not in tables:
        op.create_table(
            "batch_active_terms",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("batch_id", sa.Integer(), nullable=False),
            sa.Column("semester_name", sa.String(length=50), nullable=False),
            sa.Column("academic_year", sa.String(length=20), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["batch_id"], ["batches.batch_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("batch_id", "semester_name", "academic_year", name="uq_batch_active_terms_history"),
        )

    inspector = sa.inspect(bind)
    unique_constraints = {constraint.get("name") for constraint in inspector.get_unique_constraints("batch_active_terms")}
    if "uq_batch_active_terms_history" not in unique_constraints:
        op.create_unique_constraint(
            "uq_batch_active_terms_history",
            "batch_active_terms",
            ["batch_id", "semester_name", "academic_year"],
        )

    inspector = sa.inspect(bind)
    indexes = {index["name"] for index in inspector.get_indexes("batch_active_terms")}
    if "ix_batch_active_terms_id" not in indexes:
        op.create_index("ix_batch_active_terms_id", "batch_active_terms", ["id"], unique=False)
    if "ix_batch_active_terms_batch_active" not in indexes:
        op.create_index("ix_batch_active_terms_batch_active", "batch_active_terms", ["batch_id", "is_active"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_batch_active_terms_batch_active", table_name="batch_active_terms")
    op.drop_index("ix_batch_active_terms_id", table_name="batch_active_terms")
    op.drop_table("batch_active_terms")

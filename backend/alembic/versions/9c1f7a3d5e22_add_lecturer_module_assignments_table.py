"""add_lecturer_module_assignments_table

Revision ID: 9c1f7a3d5e22
Revises: 4b2f7c1d9e88
Create Date: 2026-04-06 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c1f7a3d5e22"
down_revision: Union[str, Sequence[str], None] = "4b2f7c1d9e88"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tables = set(inspector.get_table_names())
    if "lecturer_module_assignments" not in tables:
        op.create_table(
            "lecturer_module_assignments",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("batch_id", sa.Integer(), nullable=False),
            sa.Column("module_id", sa.Integer(), nullable=False),
            sa.Column("lecturer_user_id", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["batch_id"], ["batches.batch_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["module_id"], ["modules.module_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["lecturer_user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("batch_id", "module_id", name="uq_lecturer_module_assignments_batch_module"),
        )

    inspector = sa.inspect(bind)
    unique_constraints = {
        constraint.get("name")
        for constraint in inspector.get_unique_constraints("lecturer_module_assignments")
    }
    if "uq_lecturer_module_assignments_batch_module" not in unique_constraints:
        op.create_unique_constraint(
            "uq_lecturer_module_assignments_batch_module",
            "lecturer_module_assignments",
            ["batch_id", "module_id"],
        )

    inspector = sa.inspect(bind)
    indexes = {index["name"] for index in inspector.get_indexes("lecturer_module_assignments")}
    if "ix_lecturer_module_assignments_id" not in indexes:
        op.create_index("ix_lecturer_module_assignments_id", "lecturer_module_assignments", ["id"], unique=False)
    if "ix_lecturer_module_assignments_batch_id" not in indexes:
        op.create_index("ix_lecturer_module_assignments_batch_id", "lecturer_module_assignments", ["batch_id"], unique=False)
    if "ix_lecturer_module_assignments_lecturer_user_id" not in indexes:
        op.create_index(
            "ix_lecturer_module_assignments_lecturer_user_id",
            "lecturer_module_assignments",
            ["lecturer_user_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("ix_lecturer_module_assignments_lecturer_user_id", table_name="lecturer_module_assignments")
    op.drop_index("ix_lecturer_module_assignments_batch_id", table_name="lecturer_module_assignments")
    op.drop_index("ix_lecturer_module_assignments_id", table_name="lecturer_module_assignments")
    op.drop_table("lecturer_module_assignments")

"""add_resource_departments_join_table

Revision ID: c91d3b6a2f40
Revises: aa92c1d54f11
Create Date: 2026-04-06 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c91d3b6a2f40"
down_revision: Union[str, Sequence[str], None] = "aa92c1d54f11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "resource_departments" not in tables:
        op.create_table(
            "resource_departments",
            sa.Column("resource_id", sa.Integer(), nullable=False),
            sa.Column("dept_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["dept_id"], ["departments.dept_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["resource_id"], ["resources.resource_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("resource_id", "dept_id"),
        )

    op.execute(
        sa.text(
            """
            INSERT INTO resource_departments (resource_id, dept_id)
            SELECT r.resource_id, r.dept_id
            FROM resources
            r
            WHERE r.dept_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM resource_departments rd
                  WHERE rd.resource_id = r.resource_id
                    AND rd.dept_id = r.dept_id
              )
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "resource_departments" in tables:
        op.drop_table("resource_departments")

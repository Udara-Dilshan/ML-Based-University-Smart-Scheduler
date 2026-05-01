"""add_department_id_to_resources

Revision ID: aa92c1d54f11
Revises: c7d4b1a8f390
Create Date: 2026-04-06 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "aa92c1d54f11"
down_revision: Union[str, Sequence[str], None] = "c7d4b1a8f390"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("resources", sa.Column("dept_id", sa.Integer(), nullable=True))
    op.create_index("ix_resources_dept_id", "resources", ["dept_id"], unique=False)
    op.create_foreign_key(
        "fk_resources_dept_id",
        "resources",
        "departments",
        ["dept_id"],
        ["dept_id"],
    )

    op.execute(
        sa.text(
            """
            UPDATE resources r
            JOIN (
                SELECT faculty_id, MIN(dept_id) AS dept_id
                FROM departments
                GROUP BY faculty_id
            ) d ON d.faculty_id = r.faculty_id
            SET r.dept_id = d.dept_id
            WHERE r.dept_id IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_constraint("fk_resources_dept_id", "resources", type_="foreignkey")
    op.drop_index("ix_resources_dept_id", table_name="resources")
    op.drop_column("resources", "dept_id")

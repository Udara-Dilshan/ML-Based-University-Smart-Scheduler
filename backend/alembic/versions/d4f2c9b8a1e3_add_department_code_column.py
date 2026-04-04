"""add_department_code_column

Revision ID: d4f2c9b8a1e3
Revises: f31a9c7e2d44
Create Date: 2026-04-04 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4f2c9b8a1e3"
down_revision: Union[str, Sequence[str], None] = "f31a9c7e2d44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    department_columns = {column["name"] for column in inspector.get_columns("departments")}
    if "code" not in department_columns:
        op.add_column("departments", sa.Column("code", sa.String(length=50), nullable=True))

    # Ensure existing rows always get a usable unique code.
    op.execute(
        """
        UPDATE departments
        SET code = CONCAT('DEPT_', dept_id)
        WHERE code IS NULL OR TRIM(code) = ''
        """
    )

    # Normalize casing/whitespace for existing values.
    op.execute(
        """
        UPDATE departments
        SET code = UPPER(TRIM(code))
        WHERE code IS NOT NULL
        """
    )

    duplicate_codes = bind.execute(
        sa.text(
            """
            SELECT code
            FROM departments
            GROUP BY code
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    if duplicate_codes:
        op.execute(
            """
            UPDATE departments
            SET code = CONCAT('DEPT_', dept_id)
            WHERE code IN (
                SELECT duplicate_code
                FROM (
                    SELECT code AS duplicate_code
                    FROM departments
                    GROUP BY code
                    HAVING COUNT(*) > 1
                ) dup
            )
            """
        )

    unique_constraints = inspector.get_unique_constraints("departments")
    has_unique_code = any((constraint.get("column_names") or []) == ["code"] for constraint in unique_constraints)
    if not has_unique_code:
        op.create_unique_constraint("uq_departments_code", "departments", ["code"])

    op.alter_column(
        "departments",
        "code",
        existing_type=sa.String(length=50),
        nullable=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    department_columns = {column["name"] for column in inspector.get_columns("departments")}
    if "code" not in department_columns:
        return

    unique_constraints = inspector.get_unique_constraints("departments")
    for constraint in unique_constraints:
        if (constraint.get("column_names") or []) == ["code"] and constraint.get("name"):
            op.drop_constraint(constraint["name"], "departments", type_="unique")
            break

    op.drop_column("departments", "code")

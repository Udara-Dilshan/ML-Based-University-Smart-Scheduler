"""change_resource_type_to_varchar

Revision ID: e3b7d1a9c402
Revises: d1a9e2f4b6c3
Create Date: 2026-05-02 21:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e3b7d1a9c402"
down_revision: Union[str, Sequence[str], None] = "d1a9e2f4b6c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "resources",
        "type",
        existing_type=sa.Enum("LECTURE_HALL", "LAB", "AUDITORIUM", "GROUND", name="resourcetype"),
        type_=sa.String(length=100),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE resources
            SET type = CASE
                WHEN UPPER(TRIM(type)) IN ('LECTURE HALL', 'LECTURE_HALL') THEN 'LECTURE_HALL'
                WHEN UPPER(TRIM(type)) = 'LAB' THEN 'LAB'
                WHEN UPPER(TRIM(type)) IN ('AUDITORIUM', 'SEMINAR ROOM', 'SEMINAR_ROOM') THEN 'AUDITORIUM'
                WHEN UPPER(TRIM(type)) = 'GROUND' THEN 'GROUND'
                ELSE 'LAB'
            END
            """
        )
    )

    op.alter_column(
        "resources",
        "type",
        existing_type=sa.String(length=100),
        type_=sa.Enum("LECTURE_HALL", "LAB", "AUDITORIUM", "GROUND", name="resourcetype"),
        existing_nullable=False,
    )

"""add_faculty_code_column

Revision ID: a17c2f9d4b11
Revises: 6e95aca2133f
Create Date: 2026-04-03 12:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a17c2f9d4b11"
down_revision: Union[str, Sequence[str], None] = "6e95aca2133f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("faculties", sa.Column("code", sa.String(length=50), nullable=True))
    op.create_unique_constraint("uq_faculties_code", "faculties", ["code"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_faculties_code", "faculties", type_="unique")
    op.drop_column("faculties", "code")

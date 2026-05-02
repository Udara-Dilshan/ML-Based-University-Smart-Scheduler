"""add_required_resource_type_to_modules

Revision ID: f6c2a1d9b7e1
Revises: e3b7d1a9c402
Create Date: 2026-05-02 22:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6c2a1d9b7e1"
down_revision: Union[str, Sequence[str], None] = "e3b7d1a9c402"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("modules", sa.Column("required_resource_type", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("modules", "required_resource_type")

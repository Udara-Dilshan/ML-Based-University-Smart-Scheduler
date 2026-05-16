"""merge_heads

Revision ID: 1efe44eee6e3
Revises: b7d2c1e4a501, f6c2a1d9b7e1
Create Date: 2026-05-16 11:32:40.329903

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1efe44eee6e3'
down_revision: Union[str, Sequence[str], None] = ('b7d2c1e4a501', 'f6c2a1d9b7e1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

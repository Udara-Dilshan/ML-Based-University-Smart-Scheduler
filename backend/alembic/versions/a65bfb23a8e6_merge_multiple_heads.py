"""merge multiple heads

Revision ID: a65bfb23a8e6
Revises: 1d22bf706edf, a3f1d9c2b8e4
Create Date: 2026-05-28 21:14:15.138415

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a65bfb23a8e6'
down_revision: Union[str, Sequence[str], None] = ('1d22bf706edf', 'a3f1d9c2b8e4')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

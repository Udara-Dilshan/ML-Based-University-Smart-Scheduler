"""remove_academic_year

Revision ID: 1d22bf706edf
Revises: 1efe44eee6e3
Create Date: 2026-05-16 11:36:08.741159

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d22bf706edf'
down_revision: Union[str, Sequence[str], None] = '1efe44eee6e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('uq_batch_active_terms_history', 'batch_active_terms', type_='unique')
    op.create_unique_constraint('uq_batch_active_terms_history', 'batch_active_terms', ['batch_id', 'semester_name'])
    op.drop_column('batch_active_terms', 'academic_year')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('batch_active_terms', sa.Column('academic_year', sa.String(length=20), nullable=False, server_default="Legacy"))
    op.drop_constraint('uq_batch_active_terms_history', 'batch_active_terms', type_='unique')
    op.create_unique_constraint('uq_batch_active_terms_history', 'batch_active_terms', ['batch_id', 'semester_name', 'academic_year'])

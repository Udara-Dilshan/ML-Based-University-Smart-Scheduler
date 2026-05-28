"""add scheduler profiles table

Revision ID: e1f3b2a9c8d7
Revises: a65bfb23a8e6
Create Date: 2026-06-03 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f3b2a9c8d7'
down_revision: Union[str, Sequence[str], None] = 'a65bfb23a8e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create scheduler_profiles table linking users to their assigned faculty."""
    op.create_table(
        'scheduler_profiles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('faculty_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculties.faculty_id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_scheduler_profiles_user_id'),
    )
    op.create_index(op.f('ix_scheduler_profiles_id'), 'scheduler_profiles', ['id'], unique=False)
    op.create_index('ix_scheduler_profiles_faculty_id', 'scheduler_profiles', ['faculty_id'], unique=False)


def downgrade() -> None:
    """Drop scheduler_profiles table."""
    op.drop_index('ix_scheduler_profiles_faculty_id', table_name='scheduler_profiles')
    op.drop_index(op.f('ix_scheduler_profiles_id'), table_name='scheduler_profiles')
    op.drop_table('scheduler_profiles')

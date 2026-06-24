"""add_timetable_archiving

Revision ID: f5a89c1b7a2d
Revises: be6ba6421d3c
Create Date: 2026-06-24 23:51:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'f5a89c1b7a2d'
down_revision = 'be6ba6421d3c'
branch_labels = None
depends_on = None

def upgrade():
    # Alter enum to add ARCHIVED
    # For MySQL we just redefine the column with the new Enum values
    op.alter_column(
        'timetable_sessions', 'status',
        type_=mysql.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', collation='utf8mb4_unicode_ci'),
        existing_type=mysql.ENUM('DRAFT', 'PUBLISHED', collation='utf8mb4_unicode_ci'),
        existing_nullable=True
    )
    
    op.add_column('timetable_sessions', sa.Column('academic_year', sa.String(length=20), nullable=True))
    op.add_column('timetable_sessions', sa.Column('semester', sa.String(length=20), nullable=True))


def downgrade():
    op.drop_column('timetable_sessions', 'semester')
    op.drop_column('timetable_sessions', 'academic_year')
    
    # Revert enum
    op.alter_column(
        'timetable_sessions', 'status',
        type_=mysql.ENUM('DRAFT', 'PUBLISHED', collation='utf8mb4_unicode_ci'),
        existing_type=mysql.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', collation='utf8mb4_unicode_ci'),
        existing_nullable=True
    )

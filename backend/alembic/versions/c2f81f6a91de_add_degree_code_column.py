"""add_degree_code_column

Revision ID: c2f81f6a91de
Revises: a17c2f9d4b11
Create Date: 2026-04-03 18:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c2f81f6a91de"
down_revision: Union[str, Sequence[str], None] = "a17c2f9d4b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    degree_columns = {column["name"] for column in inspector.get_columns("degrees")}

    if "code" not in degree_columns:
        op.add_column("degrees", sa.Column("code", sa.String(length=50), nullable=True))

    # Backfill any existing rows with deterministic generated codes.
    op.execute("""
        UPDATE degrees
        SET code = CONCAT('DEG_', degree_id)
        WHERE code IS NULL OR TRIM(code) = ''
    """)

    op.alter_column(
        "degrees",
        "code",
        existing_type=sa.String(length=50),
        nullable=False,
    )

    unique_constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("degrees")}
    if "uq_degrees_code" not in unique_constraints:
        op.create_unique_constraint("uq_degrees_code", "degrees", ["code"])


def downgrade() -> None:
    op.drop_constraint("uq_degrees_code", "degrees", type_="unique")
    op.drop_column("degrees", "code")

"""add_batch_id_to_modules

Revision ID: f31a9c7e2d44
Revises: c2f81f6a91de
Create Date: 2026-04-03 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f31a9c7e2d44"
down_revision: Union[str, Sequence[str], None] = "c2f81f6a91de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    module_columns = {column["name"] for column in inspector.get_columns("modules")}
    if "batch_id" not in module_columns:
        op.add_column("modules", sa.Column("batch_id", sa.Integer(), nullable=True))

    # Backfill by degree where possible.
    op.execute(
        """
        UPDATE modules m
        JOIN (
            SELECT degree_id, MIN(batch_id) AS mapped_batch_id
            FROM batches
            GROUP BY degree_id
        ) bmap ON bmap.degree_id = m.degree_id
        SET m.batch_id = bmap.mapped_batch_id
        WHERE m.batch_id IS NULL
        """
    )

    # Fallback for any remaining rows when degree mapping is unavailable.
    op.execute(
        """
        UPDATE modules
        SET batch_id = (SELECT MIN(batch_id) FROM batches)
        WHERE batch_id IS NULL
        """
    )

    # If still NULL, there are no batches to map; stop migration with a clear message.
    remaining_nulls = bind.execute(sa.text("SELECT COUNT(*) FROM modules WHERE batch_id IS NULL")).scalar()
    if remaining_nulls and int(remaining_nulls) > 0:
        raise RuntimeError("Cannot migrate modules.batch_id because no batches exist for mapping")

    indexes = {index["name"] for index in inspector.get_indexes("modules")}
    if "ix_modules_batch_id" not in indexes:
        op.create_index("ix_modules_batch_id", "modules", ["batch_id"], unique=False)

    foreign_keys = {fk.get("name") for fk in inspector.get_foreign_keys("modules")}
    if "fk_modules_batch_id" not in foreign_keys:
        op.create_foreign_key(
            "fk_modules_batch_id",
            "modules",
            "batches",
            ["batch_id"],
            ["batch_id"],
            ondelete="CASCADE",
        )

    op.alter_column("modules", "batch_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("modules", "batch_id", existing_type=sa.Integer(), nullable=True)
    op.drop_constraint("fk_modules_batch_id", "modules", type_="foreignkey")
    op.drop_index("ix_modules_batch_id", table_name="modules")
    op.drop_column("modules", "batch_id")

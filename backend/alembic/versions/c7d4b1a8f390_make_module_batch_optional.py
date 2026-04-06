"""drop_module_batch_column

Revision ID: c7d4b1a8f390
Revises: 9c1f7a3d5e22
Create Date: 2026-04-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c7d4b1a8f390"
down_revision: Union[str, Sequence[str], None] = "9c1f7a3d5e22"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    columns = {column["name"]: column for column in inspector.get_columns("modules")}
    if "batch_id" in columns:
        for foreign_key in inspector.get_foreign_keys("modules"):
            constrained_columns = foreign_key.get("constrained_columns") or []
            if constrained_columns == ["batch_id"]:
                op.drop_constraint(foreign_key["name"], "modules", type_="foreignkey")
                break
        op.drop_column("modules", "batch_id")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    columns = {column["name"]: column for column in inspector.get_columns("modules")}
    if "batch_id" not in columns:
        op.add_column("modules", sa.Column("batch_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "modules_ibfk_2",
            "modules",
            "batches",
            ["batch_id"],
            ["batch_id"],
        )
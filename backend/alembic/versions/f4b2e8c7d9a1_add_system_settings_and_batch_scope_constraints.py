"""add_system_settings_and_batch_scope_constraints

Revision ID: f4b2e8c7d9a1
Revises: e8b3a1f9c442
Create Date: 2026-04-04 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f4b2e8c7d9a1"
down_revision: Union[str, Sequence[str], None] = "e8b3a1f9c442"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tables = set(inspector.get_table_names())

    if "system_constraints" in tables:
        constraint_columns = {column["name"] for column in inspector.get_columns("system_constraints")}
        if "batch_id" not in constraint_columns:
            op.add_column("system_constraints", sa.Column("batch_id", sa.Integer(), nullable=True))

        inspector = sa.inspect(bind)
        foreign_keys = inspector.get_foreign_keys("system_constraints")
        has_batch_fk = any((fk.get("constrained_columns") or []) == ["batch_id"] for fk in foreign_keys)
        if not has_batch_fk:
            op.create_foreign_key(
                "fk_system_constraints_batch_id",
                "system_constraints",
                "batches",
                ["batch_id"],
                ["batch_id"],
                ondelete="CASCADE",
            )

        indexes = {index["name"] for index in inspector.get_indexes("system_constraints")}
        if "ix_system_constraints_batch_id" not in indexes:
            op.create_index("ix_system_constraints_batch_id", "system_constraints", ["batch_id"], unique=False)
    else:
        op.create_table(
            "system_constraints",
            sa.Column("constraint_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("value", sa.Integer(), nullable=False),
            sa.Column("type", sa.Enum("HARD", "SOFT", name="constrainttype"), nullable=False),
            sa.Column("batch_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["batch_id"], ["batches.batch_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("constraint_id"),
        )
        op.create_index("ix_system_constraints_constraint_id", "system_constraints", ["constraint_id"], unique=False)
        op.create_index("ix_system_constraints_batch_id", "system_constraints", ["batch_id"], unique=False)

    tables = set(sa.inspect(bind).get_table_names())
    if "system_settings" not in tables:
        op.create_table(
            "system_settings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("value", sa.String(length=255), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("category", "value", name="uq_system_settings_category_value"),
        )
        op.create_index("ix_system_settings_id", "system_settings", ["id"], unique=False)
        op.create_index("ix_system_settings_category", "system_settings", ["category"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tables = set(inspector.get_table_names())

    if "system_settings" in tables:
        indexes = {index["name"] for index in inspector.get_indexes("system_settings")}
        if "ix_system_settings_category" in indexes:
            op.drop_index("ix_system_settings_category", table_name="system_settings")
        if "ix_system_settings_id" in indexes:
            op.drop_index("ix_system_settings_id", table_name="system_settings")
        op.drop_table("system_settings")

    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "system_constraints" in tables:
        columns = {column["name"] for column in inspector.get_columns("system_constraints")}
        if "batch_id" in columns:
            foreign_keys = inspector.get_foreign_keys("system_constraints")
            for fk in foreign_keys:
                if (fk.get("constrained_columns") or []) == ["batch_id"] and fk.get("name"):
                    op.drop_constraint(fk["name"], "system_constraints", type_="foreignkey")
                    break

            indexes = {index["name"] for index in inspector.get_indexes("system_constraints")}
            if "ix_system_constraints_batch_id" in indexes:
                op.drop_index("ix_system_constraints_batch_id", table_name="system_constraints")

            op.drop_column("system_constraints", "batch_id")

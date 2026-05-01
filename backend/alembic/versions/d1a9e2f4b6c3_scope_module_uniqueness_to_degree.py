"""scope_module_uniqueness_to_degree

Revision ID: d1a9e2f4b6c3
Revises: b93d8e41aa21
Create Date: 2026-04-26 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d1a9e2f4b6c3"
down_revision: Union[str, Sequence[str], None] = "b93d8e41aa21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_global_code_unique() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for constraint in inspector.get_unique_constraints("modules"):
        columns = constraint.get("column_names") or []
        name = constraint.get("name")
        if columns == ["code"] and name:
            op.drop_constraint(name, "modules", type_="unique")

    # Some MySQL schemas expose the single-column unique as an index.
    inspector = sa.inspect(bind)
    for index in inspector.get_indexes("modules"):
        columns = index.get("column_names") or []
        if index.get("unique") and columns == ["code"]:
            index_name = index.get("name")
            if index_name:
                op.drop_index(index_name, table_name="modules")


def upgrade() -> None:
    _drop_global_code_unique()

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_unique = {
        tuple(constraint.get("column_names") or [])
        for constraint in inspector.get_unique_constraints("modules")
    }

    if ("degree_id", "code") not in existing_unique:
        op.create_unique_constraint(
            "uq_modules_degree_code",
            "modules",
            ["degree_id", "code"],
        )

    if ("degree_id", "name") not in existing_unique:
        op.create_unique_constraint(
            "uq_modules_degree_name",
            "modules",
            ["degree_id", "name"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    unique_by_name = {
        constraint.get("name")
        for constraint in inspector.get_unique_constraints("modules")
        if constraint.get("name")
    }

    if "uq_modules_degree_name" in unique_by_name:
        op.drop_constraint("uq_modules_degree_name", "modules", type_="unique")

    if "uq_modules_degree_code" in unique_by_name:
        op.drop_constraint("uq_modules_degree_code", "modules", type_="unique")

    inspector = sa.inspect(bind)
    existing_unique = {
        tuple(constraint.get("column_names") or [])
        for constraint in inspector.get_unique_constraints("modules")
    }

    if ("code",) not in existing_unique:
        op.create_unique_constraint("uq_modules_code", "modules", ["code"])

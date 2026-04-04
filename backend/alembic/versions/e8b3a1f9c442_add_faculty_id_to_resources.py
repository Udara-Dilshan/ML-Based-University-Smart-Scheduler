"""add_faculty_id_to_resources

Revision ID: e8b3a1f9c442
Revises: d4f2c9b8a1e3
Create Date: 2026-04-04 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e8b3a1f9c442"
down_revision: Union[str, Sequence[str], None] = "d4f2c9b8a1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    resource_columns = {column["name"] for column in inspector.get_columns("resources")}
    if "faculty_id" not in resource_columns:
        op.add_column("resources", sa.Column("faculty_id", sa.Integer(), nullable=True))

    faculty_count = bind.execute(sa.text("SELECT COUNT(*) FROM faculties")).scalar() or 0
    if int(faculty_count) == 0:
        raise RuntimeError("Cannot migrate resources.faculty_id because no faculties exist")

    op.execute(
        """
        UPDATE resources
        SET faculty_id = (SELECT MIN(faculty_id) FROM faculties)
        WHERE faculty_id IS NULL
        """
    )

    foreign_keys = {fk.get("name") for fk in inspector.get_foreign_keys("resources")}
    if "fk_resources_faculty_id" not in foreign_keys:
        op.create_foreign_key(
            "fk_resources_faculty_id",
            "resources",
            "faculties",
            ["faculty_id"],
            ["faculty_id"],
            ondelete="RESTRICT",
        )

    indexes = {index["name"] for index in inspector.get_indexes("resources")}
    if "ix_resources_faculty_id" not in indexes:
        op.create_index("ix_resources_faculty_id", "resources", ["faculty_id"], unique=False)

    op.alter_column("resources", "faculty_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    resource_columns = {column["name"] for column in inspector.get_columns("resources")}
    if "faculty_id" not in resource_columns:
        return

    foreign_keys = inspector.get_foreign_keys("resources")
    for fk in foreign_keys:
        name = fk.get("name")
        constrained = fk.get("constrained_columns") or []
        if name and constrained == ["faculty_id"]:
            op.drop_constraint(name, "resources", type_="foreignkey")
            break

    indexes = {index["name"] for index in inspector.get_indexes("resources")}
    if "ix_resources_faculty_id" in indexes:
        op.drop_index("ix_resources_faculty_id", table_name="resources")

    op.drop_column("resources", "faculty_id")

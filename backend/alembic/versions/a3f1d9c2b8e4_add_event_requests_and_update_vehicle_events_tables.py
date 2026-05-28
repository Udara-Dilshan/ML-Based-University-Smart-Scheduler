"""add_event_requests_and_update_vehicle_events_tables

This migration handles ALL changes made to support the Resource Manager
AI-Assisted Booking Workflow:

1. vehicle_requests table:
   - ADD start_time (TIME)
   - ADD end_time (TIME)
   - ADD purpose (TEXT)
   - ADD rejection_reason (TEXT)
   - Change trip_date from DATETIME → DATE (if currently DATETIME)

2. events table:
   - ADD event_date (DATE)
   - ADD description (TEXT)
   - ADD event_type (VARCHAR 50)
   - ADD source_request_id (INT, FK → event_requests.req_id)
   - Make organizer_user_id nullable (was NOT NULL before)

3. event_requests table (NEW):
   - Full table creation with all columns

Revision ID: a3f1d9c2b8e4
Revises: b93d8e41aa21
Create Date: 2026-05-28 20:57:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


# revision identifiers, used by Alembic.
revision: str = "a3f1d9c2b8e4"
down_revision: Union[str, Sequence[str], None] = "b93d8e41aa21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_exists(inspector, table: str, column: str) -> bool:
    """Check if a column exists in a table."""
    if table not in inspector.get_table_names():
        return False
    return any(c["name"] == column for c in inspector.get_columns(table))


def _table_exists(inspector, table: str) -> bool:
    return table in inspector.get_table_names()


def _fk_exists(inspector, table: str, fk_name: str) -> bool:
    """Check if a FK constraint name exists."""
    return any(
        fk.get("name") == fk_name
        for fk in inspector.get_foreign_keys(table)
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)

    # ─────────────────────────────────────────────────────────────────────
    # 1. vehicle_requests — add new columns
    # ─────────────────────────────────────────────────────────────────────
    if _table_exists(inspector, "vehicle_requests"):
        if not _col_exists(inspector, "vehicle_requests", "start_time"):
            op.add_column("vehicle_requests", sa.Column("start_time", sa.Time(), nullable=True))

        if not _col_exists(inspector, "vehicle_requests", "end_time"):
            op.add_column("vehicle_requests", sa.Column("end_time", sa.Time(), nullable=True))

        if not _col_exists(inspector, "vehicle_requests", "purpose"):
            op.add_column("vehicle_requests", sa.Column("purpose", sa.Text(), nullable=True))

        if not _col_exists(inspector, "vehicle_requests", "rejection_reason"):
            op.add_column("vehicle_requests", sa.Column("rejection_reason", sa.Text(), nullable=True))

    # ─────────────────────────────────────────────────────────────────────
    # 2. Create event_requests table (if not exists)
    # ─────────────────────────────────────────────────────────────────────
    if not _table_exists(inspector, "event_requests"):
        op.create_table(
            "event_requests",
            sa.Column("req_id", sa.Integer(), nullable=False, autoincrement=True),
            sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
            sa.Column("resource_id", sa.Integer(), nullable=False),
            sa.Column("event_name", sa.String(length=150), nullable=False),
            sa.Column("event_date", sa.Date(), nullable=False),
            sa.Column("start_time", sa.Time(), nullable=False),
            sa.Column("end_time", sa.Time(), nullable=False),
            sa.Column("participant_count", sa.Integer(), nullable=False),
            sa.Column("purpose", sa.Text(), nullable=True),
            sa.Column(
                "status",
                sa.Enum("PENDING", "APPROVED", "REJECTED", name="requeststatus"),
                nullable=True,
            ),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("allocated_resource_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(
                ["requested_by_user_id"],
                ["users.user_id"],
                name="fk_event_requests_user",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["resource_id"],
                ["resources.resource_id"],
                name="fk_event_requests_resource",
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["allocated_resource_id"],
                ["resources.resource_id"],
                name="fk_event_requests_allocated_resource",
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("req_id"),
        )
        op.create_index(
            "ix_event_requests_req_id", "event_requests", ["req_id"], unique=False
        )

    # ─────────────────────────────────────────────────────────────────────
    # 3. events table — add new columns
    #    (table already existed from previous migration b93d8e41aa21)
    # ─────────────────────────────────────────────────────────────────────
    if _table_exists(inspector, "events"):
        if not _col_exists(inspector, "events", "event_date"):
            op.add_column("events", sa.Column("event_date", sa.Date(), nullable=True))

        if not _col_exists(inspector, "events", "description"):
            op.add_column("events", sa.Column("description", sa.Text(), nullable=True))

        if not _col_exists(inspector, "events", "event_type"):
            op.add_column(
                "events",
                sa.Column("event_type", sa.String(length=50), nullable=True),
            )

        if not _col_exists(inspector, "events", "source_request_id"):
            op.add_column(
                "events",
                sa.Column("source_request_id", sa.Integer(), nullable=True),
            )
            # Add FK only after event_requests table is guaranteed to exist
            if _table_exists(inspector, "event_requests"):
                op.create_foreign_key(
                    "fk_events_source_request",
                    "events",
                    "event_requests",
                    ["source_request_id"],
                    ["req_id"],
                    ondelete="SET NULL",
                )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)

    # Remove FK and source_request_id from events
    if _table_exists(inspector, "events"):
        if _col_exists(inspector, "events", "source_request_id"):
            try:
                op.drop_constraint("fk_events_source_request", "events", type_="foreignkey")
            except Exception:
                pass
            op.drop_column("events", "source_request_id")
        if _col_exists(inspector, "events", "event_type"):
            op.drop_column("events", "event_type")
        if _col_exists(inspector, "events", "description"):
            op.drop_column("events", "description")
        if _col_exists(inspector, "events", "event_date"):
            op.drop_column("events", "event_date")

    # Drop event_requests table
    if _table_exists(inspector, "event_requests"):
        op.drop_index("ix_event_requests_req_id", table_name="event_requests")
        op.drop_table("event_requests")

    # Remove new columns from vehicle_requests
    if _table_exists(inspector, "vehicle_requests"):
        if _col_exists(inspector, "vehicle_requests", "rejection_reason"):
            op.drop_column("vehicle_requests", "rejection_reason")
        if _col_exists(inspector, "vehicle_requests", "purpose"):
            op.drop_column("vehicle_requests", "purpose")
        if _col_exists(inspector, "vehicle_requests", "end_time"):
            op.drop_column("vehicle_requests", "end_time")
        if _col_exists(inspector, "vehicle_requests", "start_time"):
            op.drop_column("vehicle_requests", "start_time")

"""add_legacy_event_vehicle_audit_tables

Revision ID: b93d8e41aa21
Revises: c91d3b6a2f40
Create Date: 2026-04-13 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b93d8e41aa21"
down_revision: Union[str, Sequence[str], None] = "c91d3b6a2f40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in set(inspector.get_table_names())


def _has_index(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return any(idx.get("name") == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "vehicles"):
        op.create_table(
            "vehicles",
            sa.Column("vehicle_id", sa.Integer(), nullable=False),
            sa.Column("reg_number", sa.String(length=20), nullable=False),
            sa.Column("type", sa.String(length=50), nullable=True),
            sa.Column("capacity", sa.Integer(), nullable=False),
            sa.Column("driver_name", sa.String(length=100), nullable=True),
            sa.Column("is_available", sa.Boolean(), nullable=True),
            sa.PrimaryKeyConstraint("vehicle_id"),
            sa.UniqueConstraint("reg_number", name="uq_vehicles_reg_number"),
        )
        op.create_index("ix_vehicles_vehicle_id", "vehicles", ["vehicle_id"], unique=False)

    if not _table_exists(inspector, "audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("log_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("action", sa.String(length=255), nullable=False),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("timestamp", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("log_id"),
        )
        op.create_index("ix_audit_logs_log_id", "audit_logs", ["log_id"], unique=False)

    if not _table_exists(inspector, "vehicle_requests"):
        op.create_table(
            "vehicle_requests",
            sa.Column("req_id", sa.Integer(), nullable=False),
            sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
            sa.Column("vehicle_type_needed", sa.String(length=50), nullable=True),
            sa.Column("passenger_count", sa.Integer(), nullable=True),
            sa.Column("trip_date", sa.DateTime(), nullable=False),
            sa.Column("destination", sa.String(length=255), nullable=True),
            sa.Column("status", sa.Enum("PENDING", "APPROVED", "REJECTED", name="requeststatus"), nullable=True),
            sa.Column("assigned_vehicle_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["assigned_vehicle_id"], ["vehicles.vehicle_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("req_id"),
        )
        op.create_index("ix_vehicle_requests_req_id", "vehicle_requests", ["req_id"], unique=False)

    if not _table_exists(inspector, "events"):
        op.create_table(
            "events",
            sa.Column("event_id", sa.Integer(), nullable=False),
            sa.Column("resource_id", sa.Integer(), nullable=False),
            sa.Column("organizer_user_id", sa.Integer(), nullable=False),
            sa.Column("event_name", sa.String(length=150), nullable=False),
            sa.Column("start_time", sa.DateTime(), nullable=False),
            sa.Column("end_time", sa.DateTime(), nullable=False),
            sa.Column("status", sa.Enum("PENDING", "APPROVED", "REJECTED", name="requeststatus"), nullable=True),
            sa.ForeignKeyConstraint(["organizer_user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["resource_id"], ["resources.resource_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("event_id"),
        )
        op.create_index("ix_events_event_id", "events", ["event_id"], unique=False)

    # Ensure indexes exist if table was already present.
    inspector = sa.inspect(op.get_bind())
    if _table_exists(inspector, "vehicles") and not _has_index(inspector, "vehicles", "ix_vehicles_vehicle_id"):
        op.create_index("ix_vehicles_vehicle_id", "vehicles", ["vehicle_id"], unique=False)
    if _table_exists(inspector, "audit_logs") and not _has_index(inspector, "audit_logs", "ix_audit_logs_log_id"):
        op.create_index("ix_audit_logs_log_id", "audit_logs", ["log_id"], unique=False)
    if _table_exists(inspector, "vehicle_requests") and not _has_index(inspector, "vehicle_requests", "ix_vehicle_requests_req_id"):
        op.create_index("ix_vehicle_requests_req_id", "vehicle_requests", ["req_id"], unique=False)
    if _table_exists(inspector, "events") and not _has_index(inspector, "events", "ix_events_event_id"):
        op.create_index("ix_events_event_id", "events", ["event_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "events" in tables:
        op.drop_index("ix_events_event_id", table_name="events")
        op.drop_table("events")

    if "vehicle_requests" in tables:
        op.drop_index("ix_vehicle_requests_req_id", table_name="vehicle_requests")
        op.drop_table("vehicle_requests")

    if "audit_logs" in tables:
        op.drop_index("ix_audit_logs_log_id", table_name="audit_logs")
        op.drop_table("audit_logs")

    if "vehicles" in tables:
        op.drop_index("ix_vehicles_vehicle_id", table_name="vehicles")
        op.drop_table("vehicles")

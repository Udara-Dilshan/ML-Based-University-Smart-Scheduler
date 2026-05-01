import sys
from os.path import dirname, realpath

sys.path.insert(0, dirname(dirname(realpath(__file__))))

from logging.config import fileConfig

from alembic import context
from app.database.connection import Base
from app.database.connection import DATABASE_URL, initialize_database
from app.models.academic import Batch, Department, Faculty, Module
from app.models.audit import AuditLog
from app.models.lecturer_availability import LecturerAvailability
from app.models.profiles import Lecturer, Student
from app.models.resource import Resource
from app.models.settings import SystemConstraint, SystemSetting
from app.models.timetable import TimetableSession
from app.models.user import User
from sqlalchemy import engine_from_config, pool, inspect, text

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", DATABASE_URL)

target_metadata = Base.metadata

BOOTSTRAP_HEAD_REVISION = "b93d8e41aa21"

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "pyformat"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        inspector = inspect(connection)
        has_version_table = inspector.has_table("alembic_version")
        has_version_row = False
        if has_version_table:
            has_version_row = connection.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).first() is not None

        if not has_version_table or not has_version_row:
            initialize_database()
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS alembic_version (
                        version_num VARCHAR(32) NOT NULL
                    )
                    """
                )
            )
            connection.execute(text("DELETE FROM alembic_version"))
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": BOOTSTRAP_HEAD_REVISION},
            )
            connection.commit()
            return

        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
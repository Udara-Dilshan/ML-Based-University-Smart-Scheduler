"""
Database configuration and connection management.
"""
from __future__ import annotations

import os
import re
from typing import Optional, Tuple

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "university_scheduler")

TABLE_ENGINE_MISSING_PATTERN = re.compile(r"Table '([^']+)' doesn't exist in engine")
IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


def _build_database_url() -> str:
    """Create SQLAlchemy DB URL from environment variables."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    try:
        db_port = int(DB_PORT)
    except ValueError as exc:
        raise RuntimeError(f"Invalid DB_PORT value: {DB_PORT}") from exc

    return str(
        URL.create(
            drivername="mysql+pymysql",
            username=DB_USER,
            password=DB_PASSWORD or None,
            host=DB_HOST,
            port=db_port,
            database=DB_NAME,
        )
    )


DATABASE_URL = _build_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=os.getenv("DEBUG", "False") == "True",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _mysql_error_code(exc: OperationalError) -> Optional[int]:
    """Extract MySQL error code from SQLAlchemy OperationalError."""
    original = getattr(exc, "orig", None)
    if original is None or not getattr(original, "args", None):
        return None
    code = original.args[0]
    return code if isinstance(code, int) else None


def _extract_broken_table(error_text: str) -> Optional[Tuple[str, str]]:
    """
    Parse MySQL 1932 error text and return (schema, table).

    Example text:
    Table 'university_scheduler.modules' doesn't exist in engine
    """
    match = TABLE_ENGINE_MISSING_PATTERN.search(error_text)
    if not match:
        return None

    full_table_name = match.group(1)
    if "." in full_table_name:
        schema, table = full_table_name.split(".", 1)
    else:
        schema, table = DB_NAME, full_table_name

    if not IDENTIFIER_PATTERN.fullmatch(schema) or not IDENTIFIER_PATTERN.fullmatch(table):
        return None

    return schema, table


def _drop_table(schema: str, table: str) -> None:
    """Drop a broken table so SQLAlchemy can recreate it."""
    with engine.begin() as connection:
        connection.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        try:
            connection.execute(text(f"DROP TABLE IF EXISTS `{schema}`.`{table}`"))
        finally:
            connection.execute(text("SET FOREIGN_KEY_CHECKS=1"))


def initialize_database() -> None:
    """
    Ensure all ORM tables exist.

    Handles common startup failures:
    - 1045 (access denied): raise a clear credentials error.
    - 1932 (table doesn't exist in engine): drop stale table and retry.
    """
    from app import models  # noqa: F401

    repairs = 0
    max_repairs = max(1, len(Base.metadata.tables))

    while True:
        try:
            Base.metadata.create_all(bind=engine)
            return
        except OperationalError as exc:
            code = _mysql_error_code(exc)

            if code == 1045:
                raise RuntimeError(
                    "MySQL access denied. Set DB_USER/DB_PASSWORD (or DATABASE_URL) in backend/.env."
                ) from exc

            if code != 1932:
                raise

            if repairs >= max_repairs:
                raise RuntimeError(
                    "MySQL table repair limit reached while initializing schema."
                ) from exc

            broken_table = _extract_broken_table(str(getattr(exc, "orig", exc)))
            if broken_table is None:
                raise RuntimeError(
                    "MySQL reported a missing table engine (1932), but table name could not be parsed."
                ) from exc

            schema, table = broken_table
            _drop_table(schema=schema, table=table)
            repairs += 1


def get_db():
    """Yield a DB session and close it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

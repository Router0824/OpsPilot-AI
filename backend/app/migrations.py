"""Database schema bootstrap shared by local Demo Mode and production."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, inspect

from .database import Base, engine


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _config() -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    return config


def ensure_schema(target_engine: Engine = engine) -> str:
    """Upgrade a database to head, safely baselining the pre-Alembic MVP schema."""
    table_names = set(inspect(target_engine).get_table_names())
    managed_tables = set(Base.metadata.tables)
    config = _config()

    with target_engine.begin() as connection:
        config.attributes["connection"] = connection
        if not (table_names & managed_tables):
            command.upgrade(config, "head")
            return "upgraded"
        if "alembic_version" not in table_names:
            missing = managed_tables - table_names
            if missing:
                names = ", ".join(sorted(missing))
                raise RuntimeError(f"Legacy database is incomplete; cannot baseline missing tables: {names}")
            command.stamp(config, "head")
        command.upgrade(config, "head")
    return "current"


import os
import sqlite3
import subprocess
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text

from app.database import Base
from app.migrations import ensure_schema


def test_initial_migration_creates_complete_schema(tmp_path):
    backend = Path(__file__).resolve().parents[1]
    database = tmp_path / "migration.db"
    environment = {**os.environ, "DATABASE_URL": f"sqlite:///{database}"}

    subprocess.run([str(backend.parent / ".venv" / "bin" / "alembic"), "-c", "alembic.ini", "upgrade", "head"], cwd=backend, env=environment, check=True, capture_output=True, text=True)

    with sqlite3.connect(database) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        version = connection.execute("SELECT version_num FROM alembic_version").fetchone()[0]

    assert {"workspaces", "documents", "document_chunks", "memories", "tasks", "risks", "agent_runs"}.issubset(tables)
    assert version == "20261003_0001"


def test_schema_bootstrap_upgrades_empty_database(tmp_path):
    database = tmp_path / "bootstrap.db"
    target_engine = create_engine(f"sqlite:///{database}")

    assert ensure_schema(target_engine) == "upgraded"

    with target_engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar() == "20261003_0001"


def test_schema_bootstrap_baselines_complete_legacy_database(tmp_path):
    database = tmp_path / "legacy.db"
    target_engine = create_engine(f"sqlite:///{database}")
    Base.metadata.create_all(target_engine)
    assert "alembic_version" not in inspect(target_engine).get_table_names()

    assert ensure_schema(target_engine) == "current"

    with target_engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar() == "20261003_0001"


def test_schema_bootstrap_rejects_incomplete_legacy_database(tmp_path):
    database = tmp_path / "incomplete-legacy.db"
    target_engine = create_engine(f"sqlite:///{database}")
    Base.metadata.tables["workspaces"].create(target_engine)

    with pytest.raises(RuntimeError, match="Legacy database is incomplete"):
        ensure_schema(target_engine)

    assert "alembic_version" not in inspect(target_engine).get_table_names()

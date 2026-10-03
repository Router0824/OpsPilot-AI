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
        agent_run_columns = {row[1] for row in connection.execute("PRAGMA table_info(agent_runs)")}

    assert {"workspaces", "documents", "document_chunks", "memories", "tasks", "risks", "agent_runs"}.issubset(tables)
    assert {"workflow", "input_type", "human_approved"}.issubset(agent_run_columns)
    assert version == "20261003_0002"


def test_schema_bootstrap_upgrades_empty_database(tmp_path):
    database = tmp_path / "bootstrap.db"
    target_engine = create_engine(f"sqlite:///{database}")

    assert ensure_schema(target_engine) == "upgraded"

    with target_engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar() == "20261003_0002"


def test_schema_bootstrap_baselines_complete_legacy_database(tmp_path):
    database = tmp_path / "legacy.db"
    target_engine = create_engine(f"sqlite:///{database}")
    Base.metadata.create_all(target_engine)
    assert "alembic_version" not in inspect(target_engine).get_table_names()

    assert ensure_schema(target_engine) == "current"

    with target_engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar() == "20261003_0002"


def test_schema_bootstrap_upgrades_pre_alembic_legacy_database(tmp_path):
    backend = Path(__file__).resolve().parents[1]
    database = tmp_path / "pre-alembic.db"
    environment = {**os.environ, "DATABASE_URL": f"sqlite:///{database}"}
    subprocess.run([str(backend.parent / ".venv" / "bin" / "alembic"), "-c", "alembic.ini", "upgrade", "20261003_0001"], cwd=backend, env=environment, check=True, capture_output=True, text=True)
    with sqlite3.connect(database) as connection:
        connection.execute("INSERT INTO workspaces (id, name, goal, description, created_at) VALUES ('legacy-workspace', 'Legacy', 'Ship safely', '', '2026-10-03')")
        connection.execute("""INSERT INTO agent_runs (id, workspace_id, agent, input, output, latency_ms, token_usage, context_size, tool_calls_json, retrieval_json, groundedness, status, feedback, created_at)
            VALUES ('legacy-run', 'legacy-workspace', 'Meeting Intelligence', 'Kickoff', '{}', 12, NULL, 0, '[]', '[]', 'SUPPORTED', 'completed', 'approved', '2026-10-03')""")
        connection.execute("DROP TABLE alembic_version")

    target_engine = create_engine(f"sqlite:///{database}")
    assert ensure_schema(target_engine) == "current"

    with target_engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar() == "20261003_0002"
        columns = {column["name"] for column in inspect(connection).get_columns("agent_runs")}
        migrated = connection.execute(text("SELECT workflow, input_type, human_approved, feedback FROM agent_runs WHERE id = 'legacy-run'")).one()
    assert {"workflow", "input_type", "human_approved"}.issubset(columns)
    assert migrated == ("meeting_intelligence", "meeting_notes", True, None)


def test_schema_bootstrap_rejects_incomplete_legacy_database(tmp_path):
    database = tmp_path / "incomplete-legacy.db"
    target_engine = create_engine(f"sqlite:///{database}")
    Base.metadata.tables["workspaces"].create(target_engine)

    with pytest.raises(RuntimeError, match="Legacy database is incomplete"):
        ensure_schema(target_engine)

    assert "alembic_version" not in inspect(target_engine).get_table_names()

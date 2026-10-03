import json

from app import models
from app.api.routes import update_task
from app.schemas import TaskUpdate


def test_task_partial_update_preserves_unspecified_fields(db):
    workspace = models.Workspace(name="Operations", goal="Ship useful work")
    db.add(workspace)
    db.commit()
    task = models.Task(
        workspace_id=workspace.id,
        title="Draft launch plan",
        description="Original description",
        owner="Unassigned",
        priority="medium",
        status="todo",
        milestone="Week 1",
        dependencies_json="[]",
    )
    db.add(task)
    db.commit()

    result = update_task(
        task.id,
        TaskUpdate(owner="Maya", deadline="2026-10-10", priority="high", dependencies=["Confirm scope"]),
        db,
    )

    assert result["title"] == "Draft launch plan"
    assert result["description"] == "Original description"
    assert result["owner"] == "Maya"
    assert result["deadline"] == "2026-10-10"
    assert result["priority"] == "high"
    assert result["dependencies"] == ["Confirm scope"]
    assert json.loads(task.dependencies_json) == ["Confirm scope"]


def test_status_only_update_remains_supported(db):
    workspace = models.Workspace(name="Operations", goal="Ship useful work")
    db.add(workspace)
    db.commit()
    task = models.Task(workspace_id=workspace.id, title="Review launch", status="todo")
    db.add(task)
    db.commit()

    result = update_task(task.id, TaskUpdate(status="in_progress"), db)

    assert result["status"] == "in_progress"

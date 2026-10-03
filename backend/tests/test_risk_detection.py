from app import models
from app.schemas import RiskItem
from app.services.repository import create_risk
from app.tools.operations import get_workspace_status


def test_workspace_status_counts_open_risks_and_blocked_tasks(db):
    workspace = models.Workspace(name="Launch", goal="Ship an internal assistant")
    db.add(workspace)
    db.commit()
    db.add(models.Task(workspace_id=workspace.id, title="Confirm permissions", status="blocked", owner="Unassigned"))
    db.commit()
    create_risk(db, workspace.id, RiskItem(risk="Permissions have no owner", severity="critical"))

    status = get_workspace_status(db, workspace.id)

    assert status["tasks"]["blocked"] == 1
    assert status["open_risks"] == 1

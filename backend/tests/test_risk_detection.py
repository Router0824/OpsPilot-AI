from datetime import date, timedelta

from app import models
from app.schemas import RiskItem
from app.services.risk_detection import detect_risks
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


def test_detection_explains_overdue_unowned_and_conflicting_state(db):
    workspace = models.Workspace(name="Launch", goal="Ship an internal assistant")
    db.add(workspace)
    db.commit()
    db.add(models.Task(workspace_id=workspace.id, title="Approve data access", status="blocked", owner="Unassigned", priority="critical", deadline=(date.today() - timedelta(days=2)).isoformat()))
    db.add(models.Memory(workspace_id=workspace.id, type="decision", content="Use Azure OpenAI for the MVP.", importance=0.9))
    db.add(models.Memory(workspace_id=workspace.id, type="decision", content="Do not use Azure OpenAI for the MVP.", importance=0.9))
    db.commit()

    candidates = detect_risks(db, workspace.id)

    assert any("overdue" in item.evidence and "no owner" in item.evidence for item in candidates)
    assert any("conflict" in item.risk.lower() for item in candidates)

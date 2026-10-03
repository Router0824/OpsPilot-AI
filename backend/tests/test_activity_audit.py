import pytest
from fastapi import HTTPException
from sqlalchemy import func, select

from app import models
from app.api.routes import activity, analytics, approve_risk_detection, feedback, meeting_save, review_run
from app.schemas import DecisionItem, FeedbackInput, MeetingAnalysis, MeetingSave, ReviewInput, RiskItem, RiskReview


def _workspace(db):
    workspace = models.Workspace(name="Launch", goal="Ship an internal assistant")
    db.add(workspace)
    db.commit()
    return workspace


def test_activity_summary_and_filters_use_explicit_audit_fields(db):
    workspace = _workspace(db)
    db.add_all(
        [
            models.AgentRun(workspace_id=workspace.id, agent="Meeting Intelligence", workflow="meeting_intelligence", input_type="meeting_notes", input="Kickoff", output="{}", status="completed", human_approved=True),
            models.AgentRun(workspace_id=workspace.id, agent="Risk Detection", workflow="risk_detection", input_type="workspace_state", input="Tasks", output="[]", status="rejected", human_approved=False),
            models.AgentRun(workspace_id=workspace.id, agent="Copilot", workflow="operations_copilot", input_type="question", input="What changed?", output="{}", status="completed"),
        ]
    )
    db.commit()

    result = activity(workspace.id, workflow=None, status=None, limit=50, db=db)

    assert result["summary"] == {"total_runs": 3, "completed_runs": 2, "pending_reviews": 0, "approval_rate": 50.0}
    assert result["workflows"] == ["meeting_intelligence", "operations_copilot", "risk_detection"]
    assert len(activity(workspace.id, workflow="risk_detection", status="rejected", limit=50, db=db)["runs"]) == 1


def test_review_and_helpfulness_are_recorded_separately(db):
    workspace = _workspace(db)
    run = models.AgentRun(workspace_id=workspace.id, agent="Meeting Intelligence", workflow="meeting_intelligence", input_type="meeting_notes", input="Kickoff", output="{}", status="pending_review")
    db.add(run)
    db.commit()

    review_run(run.id, ReviewInput(value="approved"), db)
    feedback(run.id, FeedbackInput(value="helpful"), db)
    db.refresh(run)

    assert run.status == "completed"
    assert run.human_approved is True
    assert run.feedback == "helpful"

    with pytest.raises(HTTPException) as error:
        review_run(run.id, ReviewInput(value="rejected"), db)
    assert error.value.status_code == 409


def test_analytics_approval_rate_excludes_non_reviewed_runs(db):
    workspace = _workspace(db)
    db.add_all(
        [
            models.AgentRun(workspace_id=workspace.id, agent="Meeting", workflow="meeting_intelligence", input_type="meeting_notes", input="A", output="{}", human_approved=True),
            models.AgentRun(workspace_id=workspace.id, agent="Risk", workflow="risk_detection", input_type="workspace_state", input="B", output="{}", status="rejected", human_approved=False),
            models.AgentRun(workspace_id=workspace.id, agent="Copilot", workflow="operations_copilot", input_type="question", input="C", output="{}"),
        ]
    )
    db.commit()

    result = analytics(workspace.id, db)

    assert result["operations"]["human_approval_rate"] == 50.0


def test_invalid_review_targets_are_rejected_before_workspace_writes(db):
    workspace = _workspace(db)
    analysis = MeetingAnalysis(
        summary="Kickoff summary",
        decisions=[DecisionItem(decision="Use the approved platform")],
        action_items=[],
        risks=[],
        follow_up_questions=[],
    )

    with pytest.raises(HTTPException) as meeting_error:
        meeting_save(workspace.id, MeetingSave(analysis=analysis, run_id="missing-run"), db)
    assert meeting_error.value.status_code == 404
    assert db.scalar(select(func.count(models.Memory.id))) == 0

    wrong_workflow = models.AgentRun(workspace_id=workspace.id, agent="Meeting", workflow="meeting_intelligence", input_type="meeting_notes", input="Kickoff", output="{}", status="pending_review")
    db.add(wrong_workflow)
    db.commit()
    review = RiskReview(run_id=wrong_workflow.id, risks=[RiskItem(risk="Data access is unresolved")])

    with pytest.raises(HTTPException) as risk_error:
        approve_risk_detection(workspace.id, review, db)
    assert risk_error.value.status_code == 404
    assert db.scalar(select(func.count(models.Risk.id))) == 0

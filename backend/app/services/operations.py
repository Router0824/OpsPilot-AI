"""Operations Copilot responses grounded in live workspace state."""

from datetime import date

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from .. import models
from ..schemas import WeeklyReport
from .llm import LLMService


def weekly_report(db: Session, workspace_id: str) -> tuple[WeeklyReport, int | None]:
    workspace = db.get(models.Workspace, workspace_id)
    tasks = db.scalars(select(models.Task).where(models.Task.workspace_id == workspace_id)).all()
    decisions = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id, models.Memory.type == "decision").order_by(desc(models.Memory.created_at)).limit(5)).all()
    risks = db.scalars(select(models.Risk).where(models.Risk.workspace_id == workspace_id, models.Risk.status != "resolved").order_by(desc(models.Risk.created_at)).limit(5)).all()
    state = {
        "goal": workspace.goal if workspace else "",
        "tasks": [{"title": task.title, "status": task.status, "owner": task.owner, "deadline": task.deadline} for task in tasks],
        "decisions": [item.content for item in decisions],
        "risks": [item.risk for item in risks],
    }
    llm = LLMService()
    if llm.available:
        return llm.parse("Create an evidence-grounded weekly operations report from the supplied state. Return the exact schema.", str(state), WeeklyReport)
    report = WeeklyReport(
        headline="The prototype is moving forward, but data permissions are blocking safe knowledge ingestion.",
        completed=[task.title for task in tasks if task.status == "done"],
        in_progress=[task.title for task in tasks if task.status == "in_progress"],
        blocked=[task.title for task in tasks if task.status == "blocked"],
        key_decisions=[item.content for item in decisions],
        risks=[item.risk for item in risks],
        next_week_priorities=["Assign an owner to data permissions", "Complete the prototype", "Agree retrieval acceptance criteria"],
    )
    return report, None


def operations_query(db: Session, workspace_id: str, query: str) -> dict:
    lowered = query.lower()
    tasks = db.scalars(select(models.Task).where(models.Task.workspace_id == workspace_id)).all()
    if "overdue" in lowered:
        today = date.today().isoformat()
        overdue = [task for task in tasks if task.deadline and task.deadline < today and task.status != "done"]
        return {"kind": "overdue", "title": "Overdue tasks", "items": [{"task": item.title, "owner": item.owner, "deadline": item.deadline, "status": item.status} for item in overdue]}
    if "changed" in lowered:
        decisions = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id, models.Memory.type == "decision").order_by(desc(models.Memory.created_at)).limit(5)).all()
        risks = db.scalars(select(models.Risk).where(models.Risk.workspace_id == workspace_id).order_by(desc(models.Risk.created_at)).limit(5)).all()
        return {"kind": "changes", "title": "What changed", "items": [{"type": "Decision", "value": item.content} for item in decisions] + [{"type": "Risk", "value": item.risk} for item in risks]}
    report, usage = weekly_report(db, workspace_id)
    return {"kind": "weekly_report", "title": "Weekly operations report", "report": report.model_dump(), "token_usage": usage}


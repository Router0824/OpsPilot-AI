"""Operations-oriented tools with explicit inputs and persistent side effects."""

from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..schemas import MemoryCreate, RiskItem, TaskCreate
from ..services import repository


def search_documents(db: Session, workspace_id: str, query: str, top_k: int = 5):
    return repository.search_documents(db, workspace_id, query, top_k)


def search_memory(db: Session, workspace_id: str, query: str, top_k: int = 5):
    return repository.search_memory(db, workspace_id, query, top_k)


def search_decisions(db: Session, workspace_id: str, query: str, top_k: int = 5):
    return [hit for hit in repository.search_memory(db, workspace_id, query, top_k * 2) if hit.metadata.get("type") == "decision"][:top_k]


def get_tasks(db: Session, workspace_id: str):
    return db.scalars(select(models.Task).where(models.Task.workspace_id == workspace_id)).all()


def create_task(db: Session, workspace_id: str, payload: TaskCreate):
    return repository.create_task(db, workspace_id, payload)


def create_decision(db: Session, workspace_id: str, content: str, reason: str, source: str = "agent"):
    return repository.create_memory(db, workspace_id, MemoryCreate(type="decision", content=content, reason=reason, source=source, importance=0.9))


def create_risk(db: Session, workspace_id: str, payload: RiskItem):
    return repository.create_risk(db, workspace_id, payload)


def get_workspace_status(db: Session, workspace_id: str) -> dict:
    tasks = get_tasks(db, workspace_id)
    risks = db.scalars(select(models.Risk).where(models.Risk.workspace_id == workspace_id)).all()
    decisions = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id, models.Memory.type == "decision")).all()
    counts = Counter(task.status for task in tasks)
    return {
        "tasks": dict(counts),
        "open_risks": sum(risk.status != "resolved" for risk in risks),
        "decisions": len(decisions),
    }


"""Build bounded, task-aware context instead of dumping an entire workspace."""

from dataclasses import dataclass
from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..tools.operations import search_documents, search_memory


@dataclass
class ContextBundle:
    text: str
    sections: Dict[str, str]
    citations: List[dict]
    token_estimate: int


def _trim(text: str, characters: int) -> str:
    if len(text) <= characters:
        return text
    return text[: max(0, characters - 1)].rstrip() + "…"


def build_context(
    db: Session,
    workspace_id: str,
    query: str,
    conversation: List[str] | None = None,
    token_budget: int = 3200,
) -> ContextBundle:
    """Allocate a predictable budget across goal, memory, knowledge, tasks, and chat."""
    workspace = db.get(models.Workspace, workspace_id)
    if not workspace:
        raise ValueError("Workspace not found")

    # Approximate 4 characters/token. Operational questions shift budget toward live state.
    chars = token_budget * 4
    operational = any(term in query.lower() for term in ("block", "overdue", "status", "week", "risk", "changed", "progress"))
    allocations = (
        {"goal": 0.08, "decisions": 0.12, "memory": 0.10, "knowledge": 0.15, "tasks": 0.22, "risks": 0.15, "meetings": 0.08, "conversation": 0.10}
        if operational else
        {"goal": 0.08, "decisions": 0.18, "memory": 0.12, "knowledge": 0.28, "tasks": 0.10, "risks": 0.07, "meetings": 0.07, "conversation": 0.10}
    )
    document_hits = search_documents(db, workspace_id, query, top_k=6)
    memory_hits = search_memory(db, workspace_id, query, top_k=5)
    active_tasks = db.scalars(
        select(models.Task).where(models.Task.workspace_id == workspace_id, models.Task.status != "done").limit(8)
    ).all()
    risks = db.scalars(select(models.Risk).where(models.Risk.workspace_id == workspace_id, models.Risk.status != "resolved").limit(8)).all()
    meeting_runs = db.scalars(select(models.AgentRun).where(models.AgentRun.workspace_id == workspace_id, models.AgentRun.agent == "Meeting Intelligence").order_by(models.AgentRun.created_at.desc()).limit(3)).all()

    knowledge = "\n".join(f"[{hit.source}#{hit.metadata.get('chunk_index', 0)}] {hit.text}" for hit in document_hits)
    memory = "\n".join(f"[{hit.metadata.get('type', 'memory')}] {hit.text}" for hit in memory_hits)
    decisions = "\n".join(f"- {hit.text}" for hit in memory_hits if hit.metadata.get("type") == "decision")
    tasks = "\n".join(f"- {task.title} | {task.owner} | {task.status} | {task.priority}" for task in active_tasks)
    risk_text = "\n".join(f"- {risk.risk} | {risk.severity} | {risk.status}" for risk in risks)
    meetings = "\n".join(run.output[:600] for run in meeting_runs)
    chat = "\n".join((conversation or [])[-8:])
    sections = {
        "goal": _trim(workspace.goal, int(chars * allocations["goal"])),
        "decisions": _trim(decisions or "No relevant formal decisions.", int(chars * allocations["decisions"])),
        "memory": _trim(memory or "No relevant project memory.", int(chars * allocations["memory"])),
        "knowledge": _trim(knowledge or "No relevant document chunks.", int(chars * allocations["knowledge"])),
        "tasks": _trim(tasks or "No active tasks.", int(chars * allocations["tasks"])),
        "risks": _trim(risk_text or "No open risks.", int(chars * allocations["risks"])),
        "meetings": _trim(meetings or "No recent meeting analysis.", int(chars * allocations["meetings"])),
        "conversation": _trim(chat or "No prior conversation.", int(chars * allocations["conversation"])),
    }
    text = "\n\n".join(f"## {name.title()}\n{content}" for name, content in sections.items())
    citations = [
        {"source": hit.source, "chunk_id": hit.id, "excerpt": hit.text[:220], "score": round(hit.score, 4), "vector_score": round(hit.vector_score, 4), "keyword_score": round(hit.keyword_score, 4)}
        for hit in document_hits
    ]
    return ContextBundle(text=text, sections=sections, citations=citations, token_estimate=max(1, len(text) // 4))


def build_workspace_context(*args, **kwargs) -> ContextBundle:
    """Public operations-oriented name for task-aware context assembly."""
    return build_context(*args, **kwargs)

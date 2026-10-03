import json
import time
from collections import Counter
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import desc, func, select, text
from sqlalchemy.orm import Session

from .. import models
from ..agents import run_workspace_agent
from ..config import get_settings
from ..database import get_db
from ..demo.seed_data import DEMO_WORKSPACE_ID
from ..schemas import (
    ChatRequest,
    FeedbackInput,
    MeetingInput,
    MeetingSave,
    MemoryCreate,
    PlanRequest,
    RiskItem,
    RiskReview,
    RiskUpdate,
    ReviewInput,
    TaskCreate,
    TaskUpdate,
    WorkspaceCreate,
)
from ..services.documents import parse_document
from ..services.meeting import analyze_meeting
from ..services.planning import generate_plan
from ..services.operations import operations_query, weekly_report
from ..services.repository import add_document, create_memory, create_risk, create_task
from ..services.risk_detection import detect_risks


router = APIRouter(prefix="/api")


def _row(row: Any) -> dict:
    data = {column.name: getattr(row, column.name) for column in row.__table__.columns}
    for key, value in list(data.items()):
        if hasattr(value, "isoformat"):
            data[key] = value.isoformat()
        if key.endswith("_json"):
            data[key.removesuffix("_json")] = json.loads(value or "[]")
            del data[key]
    return data


def _workspace_or_404(db: Session, workspace_id: str) -> models.Workspace:
    workspace = db.get(models.Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    db.execute(text("SELECT 1"))
    return {"status": "ok", "mode": "demo" if settings.demo_mode or settings.provider == "demo" else "live", "provider": settings.provider, "database": db.bind.dialect.name if db.bind else "unknown"}


@router.get("/workspaces")
def list_workspaces(db: Session = Depends(get_db)) -> list[dict]:
    workspaces = db.scalars(select(models.Workspace).order_by(desc(models.Workspace.created_at))).all()
    return [_row(workspace) for workspace in workspaces]


@router.post("/workspaces", status_code=201)
def create_workspace(payload: WorkspaceCreate, db: Session = Depends(get_db)) -> dict:
    workspace = models.Workspace(**payload.model_dump())
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return _row(workspace)


@router.get("/workspaces/{workspace_id}")
def get_workspace(workspace_id: str, db: Session = Depends(get_db)) -> dict:
    return _row(_workspace_or_404(db, workspace_id))


@router.get("/workspaces/{workspace_id}/dashboard")
def dashboard(workspace_id: str, db: Session = Depends(get_db)) -> dict:
    workspace = _workspace_or_404(db, workspace_id)
    documents = db.scalars(select(models.Document).where(models.Document.workspace_id == workspace_id).order_by(desc(models.Document.created_at))).all()
    memories = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id).order_by(desc(models.Memory.created_at))).all()
    tasks = db.scalars(select(models.Task).where(models.Task.workspace_id == workspace_id).order_by(desc(models.Task.created_at))).all()
    risks = db.scalars(select(models.Risk).where(models.Risk.workspace_id == workspace_id).order_by(desc(models.Risk.created_at))).all()
    all_runs = db.scalars(select(models.AgentRun).where(models.AgentRun.workspace_id == workspace_id).order_by(desc(models.AgentRun.created_at))).all()
    runs = all_runs[:8]
    task_counts = Counter(task.status for task in tasks)
    decisions = [memory for memory in memories if memory.type == "decision"]
    return {
        "workspace": _row(workspace),
        "counts": {"documents": len(documents), "memories": len(memories), "active_tasks": task_counts["todo"] + task_counts["in_progress"], "blocked_tasks": task_counts["blocked"], "completed_tasks": task_counts["done"], "open_risks": sum(risk.status != "resolved" for risk in risks), "decisions": len(decisions), "agent_runs": len(all_runs)},
        "impact": {"meetings_processed": sum(run.agent == "Meeting Intelligence" for run in all_runs), "tasks_auto_generated": sum(task.evidence == "Generated from Meeting" for task in tasks), "decisions_captured": len(decisions), "documents_indexed": len(documents), "workflow_runs": len(all_runs), "estimated_minutes_saved": sum(run.agent == "Meeting Intelligence" and run.feedback == "approved" for run in all_runs) * 10},
        "tasks": [_row(task) for task in tasks],
        "decisions": [_row(item) for item in decisions[:5]],
        "risks": [_row(item) for item in risks[:5]],
        "runs": [_row(run) for run in runs],
        "documents": [_row(document) for document in documents],
    }


@router.get("/workspaces/{workspace_id}/documents")
def documents(workspace_id: str, db: Session = Depends(get_db)) -> list[dict]:
    _workspace_or_404(db, workspace_id)
    rows = db.scalars(select(models.Document).where(models.Document.workspace_id == workspace_id).order_by(desc(models.Document.created_at))).all()
    return [_row(row) for row in rows]


@router.post("/workspaces/{workspace_id}/documents", status_code=201)
async def upload_document(workspace_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB limit")
    try:
        content = parse_document(file.filename or "upload.txt", raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not content:
        raise HTTPException(status_code=400, detail="No readable text found")
    kind = (file.filename or "txt").rsplit(".", 1)[-1].lower()
    return _row(add_document(db, workspace_id, file.filename or "upload.txt", content, kind))


@router.get("/workspaces/{workspace_id}/memories")
def memories(workspace_id: str, db: Session = Depends(get_db)) -> list[dict]:
    _workspace_or_404(db, workspace_id)
    rows = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id).order_by(desc(models.Memory.created_at))).all()
    return [_row(row) for row in rows]


@router.get("/workspaces/{workspace_id}/decisions")
def decisions(workspace_id: str, db: Session = Depends(get_db)) -> list[dict]:
    _workspace_or_404(db, workspace_id)
    rows = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id, models.Memory.type == "decision").order_by(desc(models.Memory.created_at))).all()
    return [_row(row) for row in rows]


@router.post("/workspaces/{workspace_id}/memories", status_code=201)
def add_memory(workspace_id: str, payload: MemoryCreate, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    return _row(create_memory(db, workspace_id, payload))


@router.get("/workspaces/{workspace_id}/tasks")
def tasks(workspace_id: str, db: Session = Depends(get_db)) -> list[dict]:
    _workspace_or_404(db, workspace_id)
    rows = db.scalars(select(models.Task).where(models.Task.workspace_id == workspace_id).order_by(desc(models.Task.created_at))).all()
    return [_row(row) for row in rows]


@router.post("/workspaces/{workspace_id}/tasks", status_code=201)
def add_task(workspace_id: str, payload: TaskCreate, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    return _row(create_task(db, workspace_id, payload))


@router.patch("/tasks/{task_id}")
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)) -> dict:
    task = db.get(models.Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = payload.status
    db.commit()
    db.refresh(task)
    if payload.status == "blocked" and (task.owner == "Unassigned" or (task.deadline and task.deadline < date.today().isoformat())):
        existing = db.scalar(select(models.Risk).where(models.Risk.workspace_id == task.workspace_id, models.Risk.evidence.contains(task.title), models.Risk.status != "resolved"))
        if not existing:
            create_risk(db, task.workspace_id, RiskItem(risk=f"{task.title} is blocked without clear resolution ownership.", severity="high", evidence=f"Task '{task.title}' is blocked; owner: {task.owner}; deadline: {task.deadline or 'missing'}.", suggested_action="Assign an accountable owner and resolution date.", source="Task overdue workflow"))
    return _row(task)


@router.get("/workspaces/{workspace_id}/risks")
def risks(workspace_id: str, db: Session = Depends(get_db)) -> list[dict]:
    _workspace_or_404(db, workspace_id)
    rows = db.scalars(select(models.Risk).where(models.Risk.workspace_id == workspace_id).order_by(desc(models.Risk.created_at))).all()
    return [_row(row) for row in rows]


@router.post("/workspaces/{workspace_id}/risks", status_code=201)
def add_risk(workspace_id: str, payload: RiskItem, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    return _row(create_risk(db, workspace_id, payload))


@router.patch("/risks/{risk_id}")
def update_risk(risk_id: str, payload: RiskUpdate, db: Session = Depends(get_db)) -> dict:
    risk = db.get(models.Risk, risk_id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    risk.status = payload.status
    db.commit()
    db.refresh(risk)
    return _row(risk)


@router.post("/workspaces/{workspace_id}/chat")
def chat(workspace_id: str, payload: ChatRequest, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    return run_workspace_agent(db, workspace_id, payload.query, payload.conversation)


@router.post("/workspaces/{workspace_id}/meetings/analyze")
def meeting_analyze(workspace_id: str, payload: MeetingInput, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    started = time.perf_counter()
    analysis, token_usage = analyze_meeting(payload.notes)
    latency_ms = int((time.perf_counter() - started) * 1000)
    run = models.AgentRun(workspace_id=workspace_id, agent="Meeting Intelligence", input=payload.notes, output=analysis.model_dump_json(), latency_ms=latency_ms, token_usage=token_usage, context_size=0, tool_calls_json=json.dumps(["create_decision", "create_task", "create_risk"]), groundedness="SUPPORTED", status="pending_review")
    db.add(run)
    db.commit()
    return {"run_id": run.id, "analysis": analysis.model_dump(), "metrics": {"latency_ms": latency_ms, "token_usage": token_usage}}


@router.post("/workspaces/{workspace_id}/meetings/save")
def meeting_save(workspace_id: str, payload: MeetingSave, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    for decision in payload.analysis.decisions:
        create_memory(db, workspace_id, MemoryCreate(type="decision", content=decision.decision, reason=decision.reason, source="meeting", importance=0.9))
    for action in payload.analysis.action_items:
        create_task(db, workspace_id, TaskCreate(title=action.task, owner=action.owner, deadline=action.deadline, priority=action.priority, status=action.status, evidence="Generated from Meeting", milestone="Meeting follow-up"))
    for risk in payload.analysis.risks:
        create_risk(db, workspace_id, risk)
    create_memory(db, workspace_id, MemoryCreate(type="episodic", content=payload.analysis.summary, source="meeting", importance=0.65))
    if payload.run_id:
        run = db.get(models.AgentRun, payload.run_id)
        if run:
            run.status = "completed"
            run.feedback = "approved"
            db.commit()
    return {"saved": True, "decisions": len(payload.analysis.decisions), "tasks": len(payload.analysis.action_items), "risks": len(payload.analysis.risks)}


@router.post("/workspaces/{workspace_id}/copilot")
def copilot(workspace_id: str, payload: ChatRequest, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    started = time.perf_counter()
    result = operations_query(db, workspace_id, payload.query)
    latency = int((time.perf_counter() - started) * 1000)
    run = models.AgentRun(workspace_id=workspace_id, agent="Operations Agent → Review Agent", input=payload.query, output=json.dumps(result), latency_ms=latency, token_usage=result.get("token_usage"), context_size=0, tool_calls_json=json.dumps(["get_workspace_status", "get_tasks", "search_decisions"]), groundedness="SUPPORTED", status="completed")
    db.add(run); db.commit()
    return {"run_id": run.id, "result": result, "latency_ms": latency}


@router.post("/workspaces/{workspace_id}/automations/risk-detection")
def run_risk_detection(workspace_id: str, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    started = time.perf_counter()
    candidates = detect_risks(db, workspace_id)
    latency = int((time.perf_counter() - started) * 1000)
    run = models.AgentRun(
        workspace_id=workspace_id,
        agent="Risk Detection workflow",
        input="Tasks + Decisions → Detect operational risks",
        output=json.dumps([item.model_dump() for item in candidates]),
        latency_ms=latency,
        context_size=0,
        tool_calls_json=json.dumps(["get_tasks", "search_decisions"]),
        groundedness="SUPPORTED",
        status="pending_review",
    )
    db.add(run)
    db.commit()
    return {"run_id": run.id, "risks": [item.model_dump() for item in candidates], "latency_ms": latency}


@router.post("/workspaces/{workspace_id}/automations/risk-detection/approve")
def approve_risk_detection(workspace_id: str, payload: RiskReview, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    created = 0
    for item in payload.risks:
        existing = db.scalar(select(models.Risk).where(models.Risk.workspace_id == workspace_id, models.Risk.evidence == item.evidence, models.Risk.status != "resolved"))
        if not existing:
            create_risk(db, workspace_id, item)
            created += 1
    run = db.get(models.AgentRun, payload.run_id)
    if run and run.workspace_id == workspace_id:
        run.status = "completed"
        run.feedback = "approved"
        db.commit()
    return {"approved": len(payload.risks), "created": created, "duplicates_skipped": len(payload.risks) - created}


@router.post("/workspaces/{workspace_id}/automations/weekly-report")
def run_weekly_report(workspace_id: str, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    started = time.perf_counter()
    report, usage = weekly_report(db, workspace_id)
    latency = int((time.perf_counter() - started) * 1000)
    run = models.AgentRun(workspace_id=workspace_id, agent="Weekly Report workflow", input="Workspace state → Weekly operations report", output=report.model_dump_json(), latency_ms=latency, token_usage=usage, context_size=0, tool_calls_json=json.dumps(["get_workspace_status", "get_tasks", "search_decisions"]), groundedness="SUPPORTED", status="completed")
    db.add(run)
    db.commit()
    return {"run_id": run.id, "report": report.model_dump(), "latency_ms": latency}


@router.post("/workspaces/{workspace_id}/plans")
def plan(workspace_id: str, payload: PlanRequest, db: Session = Depends(get_db)) -> dict:
    workspace = _workspace_or_404(db, workspace_id)
    project_plan, token_usage = generate_plan(payload.prompt, workspace.goal)
    created = []
    for item in project_plan.tasks:
        created.append(create_task(db, workspace_id, TaskCreate(**item.model_dump())))
    return {"plan": project_plan.model_dump(), "created_task_ids": [item.id for item in created], "token_usage": token_usage}


@router.get("/workspaces/{workspace_id}/evaluation")
def evaluation(workspace_id: str, db: Session = Depends(get_db)) -> dict:
    _workspace_or_404(db, workspace_id)
    runs = db.scalars(select(models.AgentRun).where(models.AgentRun.workspace_id == workspace_id).order_by(desc(models.AgentRun.created_at))).all()
    latencies = [run.latency_ms for run in runs]
    feedback = Counter(run.feedback for run in runs if run.feedback)
    return {
        "summary": {"total_runs": len(runs), "avg_latency_ms": round(sum(latencies) / len(latencies)) if latencies else None, "helpful": feedback["helpful"], "not_helpful": feedback["not_helpful"], "benchmarked_accuracy": None},
        "runs": [_row(run) for run in runs],
        "note": "No benchmark accuracy is reported until a labelled evaluation set is configured.",
    }


@router.get("/workspaces/{workspace_id}/analytics")
def analytics(workspace_id: str, db: Session = Depends(get_db)) -> dict:
    dashboard_data = dashboard(workspace_id, db)
    all_runs = db.scalars(select(models.AgentRun).where(models.AgentRun.workspace_id == workspace_id)).all()
    approved = sum(run.feedback == "approved" for run in all_runs)
    successful = sum(run.status == "completed" for run in all_runs)
    return {
        "impact": dashboard_data["impact"],
        "operations": {"workflow_runs": len(all_runs), "successful_runs": successful, "average_latency_ms": round(sum(run.latency_ms for run in all_runs) / len(all_runs)) if all_runs else None, "human_approval_rate": round(approved / len(all_runs) * 100, 1) if all_runs else None},
        "assumptions": {"meeting_minutes_saved": 10, "label": "Estimated from configurable assumptions, not measured ROI."},
    }


@router.post("/agent-runs/{run_id}/feedback")
def feedback(run_id: str, payload: FeedbackInput, db: Session = Depends(get_db)) -> dict:
    run = db.get(models.AgentRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    run.feedback = payload.value
    db.commit()
    return {"saved": True, "feedback": payload.value}


@router.post("/agent-runs/{run_id}/review")
def review_run(run_id: str, payload: ReviewInput, db: Session = Depends(get_db)) -> dict:
    run = db.get(models.AgentRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    run.feedback = payload.value
    run.status = "completed" if payload.value == "approved" else "rejected"
    db.commit()
    return {"saved": True, "review": payload.value}


@router.post("/demo/reset")
def demo_reset(db: Session = Depends(get_db)) -> dict:
    # Non-destructive: the public demo keeps accumulated synthetic interactions.
    return {"workspace_id": DEMO_WORKSPACE_ID, "message": "Demo workspace ready"}

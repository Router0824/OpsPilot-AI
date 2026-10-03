import json

from sqlalchemy import select

from .. import models
from ..database import SessionLocal
from ..schemas import MemoryCreate, RiskItem, TaskCreate
from ..services.repository import add_document, create_memory, create_risk, create_task


DEMO_WORKSPACE_ID = "demo-ai-product-launch"


def seed_demo() -> None:
    db = SessionLocal()
    try:
        if db.get(models.Workspace, DEMO_WORKSPACE_ID):
            return
        workspace = models.Workspace(
            id=DEMO_WORKSPACE_ID,
            name="AI Knowledge Assistant Launch",
            goal="Launch an internal AI knowledge assistant for a 50-person team within four weeks.",
            description="A synthetic operations workspace demonstrating meeting follow-up, knowledge management, decisions, tasks, and risk detection.",
        )
        db.add(workspace)
        db.commit()
        documents = [
            ("product-brief.md", "Product Brief", "The MVP is an internal knowledge assistant for a 50-person team. It must answer policy and project questions with evidence, respect access permissions, and be ready for an internal demo within four weeks."),
            ("knowledge-management-plan.md", "Knowledge Management Plan", "Initial sources are product documentation, approved meeting notes, and project briefs. Content owners review sensitive material before indexing. Success requires grounded answers, traceable sources, and a clear escalation path."),
            ("ai-tool-evaluation.md", "AI Tool Evaluation", "Azure OpenAI fits the existing Microsoft environment and enterprise procurement path. The evaluation must still validate retrieval quality, latency, cost, and data access boundaries before the pilot expands."),
            ("launch-meeting-notes.txt", "Launch Meeting Notes", "We decided to use Azure OpenAI for the MVP because it fits existing enterprise infrastructure. Alice will build the prototype. Bob will prepare the knowledge base. Data access permissions remain unresolved and need an owner."),
        ]
        for name, _, content in documents:
            add_document(db, workspace.id, name, content, name.rsplit(".", 1)[-1])
        memories = [
            MemoryCreate(type="semantic", content="The internal pilot targets a 50-person team and a four-week launch window.", source="product-brief.md", importance=0.8),
            MemoryCreate(type="episodic", content="Launch kickoff aligned the team on prototype, knowledge preparation, and permission review.", source="Launch meeting · 2026-10-03", importance=0.75),
            MemoryCreate(type="decision", content="Use Azure OpenAI for the MVP.", reason="It fits the existing Microsoft ecosystem and enterprise infrastructure.", source="Launch meeting · 2026-10-03", importance=0.98),
        ]
        for memory in memories:
            create_memory(db, workspace.id, memory)
        tasks = [
            TaskCreate(title="Scope MVP requirements", owner="Maya", priority="high", status="done", milestone="Week 1 · Align", expected_output="Approved product brief", evidence="Human created"),
            TaskCreate(title="Build prototype", owner="Alice", priority="critical", status="in_progress", milestone="Week 2 · Build", expected_output="Working internal prototype", evidence="Generated from Meeting"),
            TaskCreate(title="Prepare knowledge base", owner="Bob", priority="high", status="todo", milestone="Week 2 · Build", expected_output="Indexed approved content", evidence="Generated from Meeting"),
            TaskCreate(title="Confirm data permissions", owner="Unassigned", deadline="2026-10-01", priority="critical", status="blocked", milestone="Week 1 · Governance", expected_output="Approved data access matrix", evidence="Generated from Meeting"),
        ]
        for task in tasks:
            create_task(db, workspace.id, task)
        create_risk(db, workspace.id, RiskItem(risk="Data access permissions are unresolved.", severity="critical", evidence="Confirm data permissions is blocked, overdue, and has no owner.", suggested_action="Assign a security owner and approve the access matrix before indexing internal data.", source="Risk Detection workflow"))
        create_risk(db, workspace.id, RiskItem(risk="Retrieval acceptance criteria are not yet agreed.", severity="medium", evidence="AI Tool Evaluation requires retrieval validation but defines no threshold.", suggested_action="Set a groundedness and retrieval test threshold before the internal demo.", source="Document review"))
        db.add(models.AgentRun(workspace_id=workspace.id, agent="Meeting Intelligence", input="Launch kickoff notes", output=json.dumps({"summary": "Team aligned on Azure OpenAI, prototype delivery, knowledge preparation, and data permissions."}), latency_ms=18, context_size=0, tool_calls_json=json.dumps(["create_decision", "create_task", "create_risk"]), groundedness="SUPPORTED", status="completed", feedback="approved"))
        db.commit()
    finally:
        db.close()

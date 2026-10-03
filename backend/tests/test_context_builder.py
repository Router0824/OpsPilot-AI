from app import models
from app.context.builder import build_context
from app.schemas import MemoryCreate, TaskCreate
from app.services.repository import add_document, create_memory, create_task


def test_context_builder_respects_sections_and_retrieves_evidence(db):
    workspace = models.Workspace(name="Memory Lab", goal="Evaluate agent memory retrieval")
    db.add(workspace)
    db.commit()
    add_document(db, workspace.id, "retrieval.md", "Hybrid retrieval improves recall by combining keyword and vector evidence.", "md")
    create_memory(db, workspace.id, MemoryCreate(type="decision", content="Reject naive buffers", reason="They surface stale context"))
    create_task(db, workspace.id, TaskCreate(title="Build retrieval benchmark", priority="high"))

    bundle = build_context(db, workspace.id, "How should we evaluate retrieval?", token_budget=400)

    assert set(bundle.sections) == {"goal", "decisions", "memory", "knowledge", "tasks", "risks", "meetings", "conversation"}
    assert "Hybrid retrieval" in bundle.sections["knowledge"]
    assert bundle.citations
    assert bundle.token_estimate <= 430

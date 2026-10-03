from app import models
from app.schemas import MemoryCreate
from app.services.repository import create_memory, search_memory


def test_memory_retrieval_prioritizes_relevant_decision(db):
    workspace = models.Workspace(name="Lab", goal="Test memory")
    db.add(workspace)
    db.commit()
    create_memory(db, workspace.id, MemoryCreate(type="semantic", content="The UI uses green accents", importance=0.4))
    create_memory(db, workspace.id, MemoryCreate(type="decision", content="Do not use naive conversation buffers", reason="Poor long term retrieval", importance=1.0))

    hits = search_memory(db, workspace.id, "conversation buffer retrieval", top_k=1)

    assert len(hits) == 1
    assert "naive conversation buffers" in hits[0].text
    assert hits[0].metadata["type"] == "decision"


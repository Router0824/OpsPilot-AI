import json
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..retrieval.hybrid import SearchItem, SearchResult, hybrid_search
from ..schemas import MemoryCreate, RiskItem, TaskCreate
from .documents import chunk_text


def add_document(db: Session, workspace_id: str, name: str, content: str, kind: str) -> models.Document:
    chunks = chunk_text(content)
    document = models.Document(workspace_id=workspace_id, name=name, content=content, kind=kind, chunk_count=len(chunks))
    db.add(document)
    db.flush()
    for index, text in enumerate(chunks):
        db.add(models.DocumentChunk(workspace_id=workspace_id, document_id=document.id, chunk_index=index, source=name, text=text, metadata_json=json.dumps({"kind": kind})))
    db.commit()
    db.refresh(document)
    return document


def search_documents(db: Session, workspace_id: str, query: str, top_k: int = 5) -> List[SearchResult]:
    rows = db.scalars(select(models.DocumentChunk).where(models.DocumentChunk.workspace_id == workspace_id)).all()
    items = [SearchItem(row.id, row.text, row.source, {"document_id": row.document_id, "chunk_index": row.chunk_index}) for row in rows]
    return hybrid_search(query, items, top_k)


def search_memory(db: Session, workspace_id: str, query: str, top_k: int = 5) -> List[SearchResult]:
    rows = db.scalars(select(models.Memory).where(models.Memory.workspace_id == workspace_id)).all()
    items = [SearchItem(row.id, f"{row.content} {row.reason}", row.source, {"type": row.type, "importance": row.importance}) for row in rows]
    results = hybrid_search(query, items, top_k * 2)
    for result in results:
        result.score = min(1.0, result.score * 0.85 + float(result.metadata.get("importance", 0.5)) * 0.15)
    return sorted(results, key=lambda item: item.score, reverse=True)[:top_k]


def create_memory(db: Session, workspace_id: str, payload: MemoryCreate) -> models.Memory:
    memory = models.Memory(workspace_id=workspace_id, **payload.model_dump())
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


def create_task(db: Session, workspace_id: str, payload: TaskCreate) -> models.Task:
    data = payload.model_dump(exclude={"dependencies"})
    task = models.Task(workspace_id=workspace_id, dependencies_json=json.dumps(payload.dependencies), **data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def create_risk(db: Session, workspace_id: str, payload: RiskItem) -> models.Risk:
    risk = models.Risk(workspace_id=workspace_id, **payload.model_dump())
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk

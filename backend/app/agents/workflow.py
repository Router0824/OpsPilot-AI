"""Operations workflow: Knowledge Agent → Operations Agent → Review Agent."""

import json
import time
from typing import List

from sqlalchemy.orm import Session

from .. import models
from ..context.builder import build_context
from ..schemas import AgentAnswer, MemoryCreate
from ..services.llm import LLMService
from ..services.repository import create_memory


def _demo_answer(query: str, context: str, citations: List[dict]) -> AgentAnswer:
    evidence = [f"{item['source']}: {item['excerpt']}" for item in citations[:3]]
    is_plan = any(word in query.lower() for word in ("plan", "finish", "week", "roadmap"))
    findings = [
        "The current design separates working context from durable project memory.",
        "Retrieval quality and memory write policies remain the main validation risks.",
    ]
    if evidence:
        findings[0] = f"The workspace evidence highlights: {evidence[0]}"
    actions = (
        ["Define a retrieval benchmark and acceptance criteria", "Implement the baseline behind a stable interface", "Run ablations and record a decision"]
        if is_plan
        else ["Evaluate retrieval with labelled queries", "Resolve the highest-impact active task", "Record rejected approaches as decision memory"]
    )
    answer = (
        "The project has a credible architecture, but its open problems are empirical: choosing a memory write policy, measuring retrieval quality, and proving that recalled decisions prevent repeated mistakes. "
        "The next iteration should prioritize an evaluation set before adding infrastructure."
    )
    return AgentAnswer(
        answer=answer,
        findings=findings,
        knowledge_gaps=["No labelled retrieval benchmark is attached yet", "Long-horizon memory usefulness has not been measured"],
        recommended_actions=actions,
        groundedness="SUPPORTED" if len(citations) >= 2 else "PARTIAL",
    )


def run_workspace_agent(db: Session, workspace_id: str, query: str, conversation: List[str] | None = None) -> dict:
    started = time.perf_counter()
    bundle = build_context(db, workspace_id, query, conversation)
    llm = LLMService()
    token_usage = None
    if llm.available:
        system = (
            "You are OpsPilot's Knowledge, Operations, and Review workflow. "
            "Use only supplied workspace context. Respect past decisions, identify missing evidence, and return the exact schema."
        )
        result, token_usage = llm.parse(system, f"Request:\n{query}\n\nWorkspace context:\n{bundle.text}", AgentAnswer)
    else:
        result = _demo_answer(query, bundle.text, bundle.citations)

    latency_ms = int((time.perf_counter() - started) * 1000)
    tool_calls = ["get_workspace_status", "search_documents", "search_decisions", "search_memory", "get_tasks"]
    run = models.AgentRun(
        workspace_id=workspace_id,
        agent="Knowledge Agent → Operations Agent → Review Agent",
        input=query,
        output=result.model_dump_json(),
        latency_ms=latency_ms,
        token_usage=token_usage,
        context_size=bundle.token_estimate,
        tool_calls_json=json.dumps(tool_calls),
        retrieval_json=json.dumps(bundle.citations),
        groundedness=result.groundedness,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    if result.findings:
        create_memory(
            db,
            workspace_id,
            MemoryCreate(type="episodic", content=result.findings[0], source=f"agent-run:{run.id}", importance=0.55),
        )
    return {
        "run_id": run.id,
        "result": result.model_dump(),
        "citations": bundle.citations,
        "metrics": {"latency_ms": latency_ms, "token_usage": token_usage, "context_size": bundle.token_estimate, "tool_calls": tool_calls},
    }

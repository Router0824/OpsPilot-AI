# Architecture

OpsPilot keeps the MVP intentionally inspectable. FastAPI owns project state and orchestration; Next.js renders the product experience. SQLite is the zero-setup default. PostgreSQL 17 uses the same SQLAlchemy repository boundary, Psycopg driver, and versioned Alembic migrations.

## Request path

1. The Context Engine gives each source a fixed share of the token budget.
2. Hybrid retrieval scores every chunk with feature-hashed cosine similarity and query-term coverage.
3. Knowledge, Operations, and Review stages produce one validated `AgentAnswer` or workflow-specific structured output.
4. The workflow name, input type, run status, human approval, feedback, retrieval trace, latency, context size, tool calls, and optional token usage are stored independently.
5. A high-value finding becomes episodic memory for later runs.

## Executable operations workflows

Automation runs are persisted as `AgentRun` records. Read-only workflows such as Weekly Report complete immediately. Write workflows such as Risk Detection first produce a pending-review proposal; approval persists only selected risks and de-duplicates them by workspace and evidence, while rejection records the review without modifying workspace state.

The AI Activity view is the operational audit surface over those records. Human approval is deliberately separate from helpful/not-helpful feedback: approval controls whether a proposed write is accepted, while feedback evaluates the usefulness of an already-produced result. Approval-rate metrics use only reviewed runs as their denominator.

## Current trade-offs

- Vector retrieval is local feature hashing, not a hosted embedding model.
- Orchestration is explicit Python, not a graph framework.
- Demo mode is deterministic, so reviewers can evaluate the whole product without credentials.
- SQLite is optimized for a single-instance MVP; the tested PostgreSQL Compose overlay is the production persistence path, with pgvector remaining a retrieval upgrade.

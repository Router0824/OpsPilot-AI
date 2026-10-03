# Architecture

OpsPilot keeps the MVP intentionally inspectable. FastAPI owns project state and orchestration; Next.js renders the product experience. SQLite is the zero-setup default, while the SQLAlchemy repository boundary allows a PostgreSQL URL without changing domain code.

## Request path

1. The Context Engine gives each source a fixed share of the token budget.
2. Hybrid retrieval scores every chunk with feature-hashed cosine similarity and query-term coverage.
3. Research, Execution/Planning, and Review stages produce one validated `AgentAnswer`.
4. The run, retrieval trace, latency, context size, tool calls, and optional token usage are stored.
5. A high-value finding becomes episodic memory for later runs.

## Current trade-offs

- Vector retrieval is local feature hashing, not a hosted embedding model.
- Orchestration is explicit Python, not a graph framework.
- Demo mode is deterministic, so reviewers can evaluate the whole product without credentials.
- SQLite is optimized for a single-instance MVP; production multi-instance deployments should use PostgreSQL and pgvector.


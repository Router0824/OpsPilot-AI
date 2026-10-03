# Evaluation

OpsPilot reports only observed run data. It never invents accuracy.

The Evaluation page records top-k chunks and their vector, keyword, and fused scores; latency; context size; provider token usage when available; tool calls; a Review Agent groundedness label; and human helpful/not-helpful feedback. The separate AI Activity audit records workflow execution and approval state, so approval is never misreported as answer-quality feedback.

No aggregate quality score is shown until a labelled benchmark is configured. The recommended next step is a versioned set of workspace questions with relevant chunk IDs and expected decision constraints, followed by retrieval Recall@K and human-rated answer groundedness.

Infrastructure checks also cover migration reproducibility: tests apply the complete Alembic history to a blank database, verify the expected tables and revision, and `alembic check` detects model/schema drift.

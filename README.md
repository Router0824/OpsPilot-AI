# OpsPilot AI

**An open-source operations workspace that turns meetings, documents, and project activity into decisions, tasks, risks, and durable organizational memory.**

[简体中文](README.zh-CN.md) · English

[![CI](https://github.com/Router0824/OpsPilot-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Router0824/OpsPilot-AI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-2f6f5e.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688)](https://fastapi.tiangolo.com/)

OpsPilot AI is a portfolio-ready, full-stack product for practical AI operations. It brings knowledge retrieval, meeting follow-up, task coordination, decision history, risk detection, workflow review, and operational analytics into one inspectable workspace.

The repository runs end to end in deterministic Demo Mode without an API key. Live mode supports OpenAI, Azure OpenAI, and DeepSeek through a shared structured-output boundary.

## Why OpsPilot

Teams rarely lack information; they lack continuity. Important context is scattered across meeting notes, documents, task boards, and chat. Decisions lose their rationale, action items lose their owners, and recurring status work stays manual.

OpsPilot connects that operating loop:

```text
Information → Knowledge → Decision → Action → Workflow → Memory
```

## Product capabilities

- **Meeting Intelligence** — turns meeting notes into a reviewable summary, decisions, action items, owners, deadlines, risks, and open questions.
- **Knowledge Center** — parses PDF, TXT, and Markdown files and exposes traceable retrieval results.
- **Operations Copilot** — answers questions about project status, blockers, overdue work, and recent changes from current workspace state.
- **Interactive Task Board** — supports drag and drop, complete task editing, quick creation, owner and priority filters, overdue signals, and attention views.
- **Decision Memory** — preserves decisions, rationale, confidence, and source context for future work.
- **Risk Tracking** — detects blocked work, missing ownership, deadlines, unresolved dependencies, and conflicting decisions.
- **Workflow Automation** — packages recurring operations such as meeting follow-up, document indexing, weekly reporting, and risk detection.
- **Human review** — keeps proposed writes pending until a person approves or rejects them.
- **Activity audit and analytics** — records workflow status, approval, feedback, latency, context size, tool calls, and token usage when available.
- **Bilingual interface** — provides persistent English and Simplified Chinese UI across the complete product.

## Demo walkthrough

The bundled `AI Knowledge Assistant Launch` workspace demonstrates the product with synthetic data:

1. Review workspace health, active risks, decisions, and milestones.
2. Analyze the seeded kickoff meeting and review the proposed records.
3. Edit and approve decisions, tasks, and risks before they enter workspace memory.
4. Use the Task Board to inspect blocked, overdue, or unassigned work.
5. Ask Operations Copilot for a weekly status or the next priorities.
6. Inspect the activity audit and operational analytics.

## Architecture

```mermaid
flowchart LR
    Inputs[Meetings & Documents] --> Intelligence[Meeting / Knowledge Intelligence]
    Intelligence --> Context[Context Engine & Hybrid Retrieval]
    State[Tasks · Decisions · Risks · Memory] <--> Context
    Context --> Operations[Operations Agent]
    Operations --> Review[Review Agent]
    Review --> Human[Human Approval]
    Human --> State
```

```text
apps/web/                 Next.js 16 + React 19 interface
backend/app/api/          FastAPI routes
backend/app/agents/       Operations workflow orchestration
backend/app/context/      Token-budgeted context builder
backend/app/retrieval/    Local vector + keyword hybrid retrieval
backend/app/services/     LLM, meeting, planning, document, and risk services
backend/app/demo/         Deterministic synthetic workspace
backend/migrations/       Alembic migrations for SQLite and PostgreSQL
backend/tests/            Backend behavior and migration tests
docs/                     Product, architecture, and evaluation notes
```

The default database is SQLite for zero-configuration local use. The same SQLAlchemy repository layer and Alembic history support PostgreSQL for production deployments.

More detail: [Architecture](docs/architecture.md) · [Product brief](docs/product.md) · [Evaluation](docs/evaluation.md)

## Technology

- Next.js 16, React 19, TypeScript
- FastAPI, Pydantic, SQLAlchemy, Alembic
- SQLite; optional PostgreSQL 17 + Psycopg
- OpenAI Responses API, Azure OpenAI, and DeepSeek provider adapters
- Deterministic local hybrid retrieval and PyPDF extraction
- Docker Compose and GitHub Actions

## Quick start

Prerequisites: Node.js 22+, Python 3.11+, and [`uv`](https://docs.astral.sh/uv/).

```bash
git clone https://github.com/Router0824/OpsPilot-AI.git
cd OpsPilot-AI
cp .env.example .env
make install
```

Start the API:

```bash
make dev-backend
```

Start the web app in another terminal:

```bash
make dev-web
```

Open [http://localhost:3000](http://localhost:3000). API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Model configuration

Demo Mode is enabled by default and makes no external model requests:

```dotenv
DEMO_MODE=true
```

For live mode, set `DEMO_MODE=false` and configure one supported provider in `.env`:

```dotenv
# DeepSeek
DEEPSEEK_API_KEY=your_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash

# Or OpenAI
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# Or Azure OpenAI
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment
AZURE_OPENAI_API_VERSION=2024-10-21
```

Credentials are read only from server-side environment variables. They are never bundled into the browser application.

## Tests and quality checks

```bash
make test
```

The command runs backend tests, frontend linting, type checking, and the production Next.js build. CI also validates database migrations and Docker Compose configuration.

## Deployment

### Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The web app runs on port `3000`, the API on `8000`, and SQLite data persists in a named volume.

For PostgreSQL:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build
```

### Vercel + Railway or Render

1. Deploy `backend/` as a Docker service with persistent storage or PostgreSQL.
2. Configure `CORS_ORIGINS` and the required model-provider variables.
3. Deploy `apps/web/` to Vercel with `apps/web` as the root directory.
4. Set `NEXT_PUBLIC_API_URL` to the public API origin.
5. Verify `/api/health`, migrations, CORS, upload limits, and persistent storage.

## Security and data handling

- `.env`, local databases, uploads, caches, and build artifacts are excluded from version control.
- The repository contains synthetic demo content only.
- Write-oriented workflows require explicit human approval.
- Uploaded content stays on the configured backend and is not embedded in the frontend bundle.
- Demo Mode makes no external API call.

## Roadmap

- Authentication, workspace membership, and role-based access
- Background ingestion, OCR, and connector-based synchronization
- PostgreSQL + pgvector and provider embeddings
- Labelled retrieval and groundedness benchmarks
- Streaming workflow runs and a visual workflow editor
- Configurable retention, memory consolidation, and approval policies

## Contributing

Issues and focused pull requests are welcome. Keep Demo Mode deterministic, add tests for changed behavior, and run `make test` before submitting.

## License

Released under the [MIT License](LICENSE).

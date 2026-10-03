from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .config import get_settings
from .demo.seed_data import seed_demo
from .migrations import ensure_schema


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_schema()
    seed_demo()
    yield


settings = get_settings()
app = FastAPI(
    title="OpsPilot AI API",
    description="Knowledge → Context → Decisions → Actions → Memory",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/")
def root() -> dict:
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}

.PHONY: install dev-backend dev-web test build docker

install:
	uv venv --python 3.11 .venv
	uv pip install --python .venv/bin/python -r backend/requirements.txt
	cd apps/web && npm install

dev-backend:
	cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000

dev-web:
	cd apps/web && npm run dev

test:
	cd backend && ../.venv/bin/python -m pytest -q
	cd apps/web && npm run lint && npm run build

build:
	cd apps/web && npm run build

docker:
	docker compose up --build


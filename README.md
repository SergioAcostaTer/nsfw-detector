# NSFW Scanner

Local-first NSFW media scanner and moderation workspace built with FastAPI, SQLite, ONNX Runtime, OpenCV, React, and Vite.

## What It Does

This application scans local media, flags likely explicit content, and gives the user a desktop-style review workflow to:

- inspect flagged files
- mark false positives safe
- quarantine problematic files
- restore mistakes
- permanently delete when necessary

It is designed to work entirely on the local machine.

## Why It Exists

Most detector demos can classify files, but they are not complete products. Real users need:

- privacy
- review speed
- persistent moderation state
- reversible destructive actions
- restart recovery for long scans

This project focuses on those practical requirements.

## Core Capabilities

- folder scans and whole-machine scans
- scan mode selection:
  - photos only
  - videos only
  - photos + videos
- photo-only as the default trigger mode
- persisted scan sessions in SQLite
- recovered scans after restart
- review workspace with folder tree, review surface, and inspector
- safe/rescue overrides persisted in the database
- quarantine vault with restore and auto-delete
- CSV export

## Architecture At A Glance

Backend:

- FastAPI API layer
- SQLite persistence
- in-memory queue with persisted recovery
- staged scan pipeline

Frontend:

- React + Vite + TypeScript
- React Query for server state
- review-focused shell and moderation workflow

## Documentation

Start here:

- [Documentation Index](./docs/README.md)

Key documents:

- [Product Overview](./docs/product-overview.md)
- [Backend Architecture](./docs/backend-architecture.md)
- [Scan Pipeline](./docs/scan-pipeline.md)
- [Data Model](./docs/data-model.md)
- [API Reference](./docs/api-reference.md)
- [Frontend Review Workflow](./docs/review-workflow.md)
- [Operations Guide](./docs/operations.md)

## Repository Layout

- `backend/app/main.py`
  FastAPI bootstrap and startup lifecycle
- `backend/app/api/routes/`
  route modules
- `backend/app/application/jobs/`
  queue and recovery wiring
- `backend/app/domain/scan/`
  staged scan pipeline
- `backend/app/domain/media/`
  media identity and type logic
- `backend/app/infrastructure/db/repositories/`
  SQL access
- `frontend/src/app/`
  app shell and providers
- `frontend/src/features/`
  feature-level UI and API code
- `frontend/src/shared/`
  shared client, types, formatting, and UI helpers
- `docs/`
  product, technical, and operations docs

## First-Time Setup

Windows:

```powershell
./scripts/dev/bootstrap.ps1
```

Linux/macOS:

```bash
chmod +x scripts/dev/*.sh
./scripts/dev/bootstrap.sh
```

## Normal Development

Windows:

```powershell
./scripts/dev/start.ps1
```

Linux/macOS:

```bash
./scripts/dev/start.sh
```

Frontend:

- `http://localhost:5173`

Backend:

- `http://localhost:8000`

## Stop Development Services

Windows:

```powershell
./scripts/dev/stop.ps1
```

Linux/macOS:

```bash
./scripts/dev/stop.sh
```

## Manual Run

Backend:

```bash
cd backend
../venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
pnpm dev
```

## Validation

Backend import:

```bash
cd backend
../venv/Scripts/python.exe -c "from app.main import app; print('OK')"
```

Frontend typecheck:

```bash
cd frontend
npx tsc --noEmit
```

Recommended additional checks:

Backend:

```bash
cd backend
pytest
ruff check .
black --check .
```

Frontend:

```bash
cd frontend
npm run lint
```

## Operational Notes

### Default scan mode

Default scan mode is:

- photos only

This is deliberate because video scanning is slower and should be opt-in.

### Restart recovery

If the app closes during a scan:

- queue state is lost
- the SQLite session remains
- on next startup the backend re-enqueues the interrupted job
- unchanged-file skipping makes this behave like a practical resume

### Quarantine model

Quarantine is reversible. The intended flow is:

1. review flagged items
2. rescue false positives
3. quarantine the rest
4. restore mistakes if needed
5. let retention-based cleanup handle the rest

## Tooling

Backend:

- `black`
- `ruff`

Frontend:

- `eslint`
- `prettier`

See:

- `backend/pyproject.toml`
- `frontend/eslint.config.js`
- `frontend/.prettierrc.json`

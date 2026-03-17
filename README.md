# NSFW Scanner

Local-first NSFW Scanner built with FastAPI, SQLite, ONNX Runtime, OpenCV, React, and Vite.

## What It Does

- Scans image folders and sampled video frames for NSFW content
- Stores scan sessions and latest results in SQLite
- Supports review, quarantine, restore, delete, CSV export, and auto-delete
- Uses a local job queue and batched inference for better scan throughput

## Project Layout

- `backend/app/main.py`: FastAPI bootstrap
- `backend/app/api/routes/`: route modules
- `backend/app/application/jobs/`: in-memory job queue
- `backend/app/domain/scan/`: staged scan pipeline
- `backend/app/infrastructure/db/repositories/`: SQL access layer
- `frontend/src/app/`: frontend app bootstrap
- `frontend/src/shared/`: shared client, types, formatters, theme, query keys
- `docs/`: backend architecture, scan pipeline, and data model docs

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

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8000`

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

## Tooling

Backend:

- `black`
- `ruff`

Frontend:

- `eslint`
- `prettier`

See `backend/pyproject.toml`, `frontend/eslint.config.js`, and `frontend/.prettierrc.json`.

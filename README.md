# NSFW Scanner

Local web app for scanning image folders with an ONNX NSFW model, reviewing flagged files, quarantining them, and auto-deleting quarantined files after 30 days.

## Stack

- `backend/`: FastAPI API, SQLite lifecycle tracking, ONNX inference, quarantine jobs
- `frontend/`: React + Vite + TypeScript UI
- Root launch scripts: `start.sh`, `start.bat`

## Quickstart

1. Put your model at [backend/models/nudenet.onnx](/C:/Users/Sergio/Desktop/nsfw-detector/backend/models/nudenet.onnx).
2. Start the stack:
   - Windows: `start.bat`
   - Linux/macOS: `chmod +x start.sh && ./start.sh`
3. Open `http://localhost:5173`.

## Backend

Install deps with:

```bash
cd backend
pip install -r requirements.txt
python run_backend.py
```

API base URL: `http://localhost:8000`

## Frontend

Install deps with:

```bash
cd frontend
pnpm install
pnpm dev
```

The Vite dev server proxies `/api/*` to the backend.

## Notes

- Quarantined files are served only through `/api/image?path=...`.
- Review and quarantine grids use `/api/thumbnail?path=...` for lightweight previews.
- Database migrations run automatically on FastAPI startup.

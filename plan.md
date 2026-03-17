# 🛡️ NSFW Scanner — Full Migration Plan
### Codex Execution Guide: Python CLI + Streamlit → FastAPI + React (Vite + shadcn)

---

## 🎯 OBJECTIVE

Transform the current project into a **local web application** running on `http://localhost` with:
- **React frontend** (Vite + TypeScript + shadcn/ui) — Google Drive–inspired UX
- **Python FastAPI backend** — preserving ONNX inference engine
- **SQLite lifecycle management** — quarantine → auto-delete pipeline
- **Single repo** — one `git clone`, one start script

---

## 🧱 FINAL REPOSITORY STRUCTURE

```
nsfw-scanner/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api.py                  # FastAPI entrypoint
│   │   ├── config.py
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   ├── scanner/
│   │   │   ├── __init__.py
│   │   │   ├── scan.py
│   │   │   ├── detector.py
│   │   │   ├── decision.py
│   │   │   └── file_utils.py
│   │   ├── actions/
│   │   │   ├── __init__.py
│   │   │   ├── move.py
│   │   │   └── delete.py
│   │   └── jobs/
│   │       ├── __init__.py
│   │       └── auto_delete.py
│   ├── models/
│   │   └── nudenet.onnx            # Place model here
│   ├── data/
│   │   └── .gitkeep
│   ├── quarantine/
│   │   └── .gitkeep
│   ├── requirements.txt
│   └── run_backend.py
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Scan.tsx
│   │   │   ├── Review.tsx
│   │   │   ├── Quarantine.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── scan/
│   │   │   │   ├── FolderPicker.tsx
│   │   │   │   └── ScanProgress.tsx
│   │   │   ├── review/
│   │   │   │   ├── ImageGrid.tsx
│   │   │   │   ├── ImageCard.tsx
│   │   │   │   └── FilterBar.tsx
│   │   │   └── quarantine/
│   │   │       └── QuarantineCard.tsx
│   │   ├── hooks/
│   │   │   ├── useScan.ts
│   │   │   ├── useResults.ts
│   │   │   └── useQuarantine.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── start.sh                        # Unix: starts both backend + frontend
├── start.bat                       # Windows: starts both backend + frontend
└── README.md
```

---

## ⚙️ PHASE 1 — BACKEND (FastAPI)

### 1.1 — `backend/requirements.txt`

```txt
fastapi
uvicorn[standard]
python-multipart
onnxruntime-gpu
opencv-python-headless
Pillow
tqdm
apscheduler
```

> **Note**: `apscheduler` handles the 30-day auto-delete background job.

---

### 1.2 — Database Schema Update (`backend/app/db/models.py`)

Migrate the existing SQLite schema with new lifecycle columns:

```python
def init_db(conn):
    conn.execute('''
    CREATE TABLE IF NOT EXISTS files (
        id              INTEGER PRIMARY KEY,
        path            TEXT UNIQUE,
        size            INTEGER,
        mtime           INTEGER,
        hash            TEXT,
        last_scanned_at INTEGER,
        folder          TEXT,
        status          TEXT DEFAULT 'active',
        quarantined_at  INTEGER,
        deleted_at      INTEGER
    )
    ''')

    conn.execute('''
    CREATE TABLE IF NOT EXISTS results (
        id         INTEGER PRIMARY KEY,
        file_id    INTEGER,
        score      REAL,
        decision   TEXT,
        classes    TEXT,
        created_at INTEGER,
        FOREIGN KEY(file_id) REFERENCES files(id)
    )
    ''')

    conn.execute('''
    CREATE TABLE IF NOT EXISTS scan_sessions (
        id         INTEGER PRIMARY KEY,
        folder     TEXT,
        started_at INTEGER,
        ended_at   INTEGER,
        total      INTEGER DEFAULT 0,
        flagged    INTEGER DEFAULT 0,
        status     TEXT DEFAULT 'running'
    )
    ''')

    conn.commit()
```

**Migration script** (run once on existing databases):

```python
# backend/app/db/migrate.py
def run_migrations(conn):
    existing_cols = [row[1] for row in conn.execute("PRAGMA table_info(files)").fetchall()]
    new_cols = {
        "folder":         "TEXT",
        "status":         "TEXT DEFAULT 'active'",
        "quarantined_at": "INTEGER",
        "deleted_at":     "INTEGER",
    }
    for col, definition in new_cols.items():
        if col not in existing_cols:
            conn.execute(f"ALTER TABLE files ADD COLUMN {col} {definition}")
    conn.commit()
```

---

### 1.3 — Lifecycle States

| Status | Meaning |
|---|---|
| `active` | On disk, scanned, not actioned |
| `quarantined` | Moved to `./quarantine/`, pending review |
| `deleted` | Permanently removed from disk |

---

### 1.4 — Updated Scan (`backend/app/scanner/scan.py`)

```python
import cv2
import time
from pathlib import Path
from tqdm import tqdm

from app.scanner.detector import Detector
from app.scanner.decision import decide
from app.db.database import get_conn
from app.db.models import init_db
from app.config import IMAGE_EXTENSIONS

def scan_folder(folder: Path, session_id: int | None = None):
    conn = get_conn()
    init_db(conn)
    detector = Detector()

    files = [p for p in folder.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]
    flagged = 0

    for path in tqdm(files):
        try:
            stat = path.stat()

            existing = conn.execute(
                "SELECT mtime FROM files WHERE path = ?", (str(path),)
            ).fetchone()

            if existing and existing[0] == stat.st_mtime:
                continue

            image = cv2.imread(str(path))
            if image is None:
                continue

            detections = detector.detect(image)
            decision, score = decide(detections)

            conn.execute(
                """INSERT OR REPLACE INTO files (path, size, mtime, folder, status)
                   VALUES (?, ?, ?, ?, 'active')""",
                (str(path), stat.st_size, stat.st_mtime, str(folder))
            )

            file_id = conn.execute(
                "SELECT id FROM files WHERE path = ?", (str(path),)
            ).fetchone()[0]

            conn.execute(
                """INSERT INTO results (file_id, score, decision, classes, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (file_id, score, decision, str(detections), int(time.time()))
            )

            if decision != "safe":
                flagged += 1

        except Exception as e:
            print(f"Error processing {path}: {e}")

    if session_id:
        conn.execute(
            "UPDATE scan_sessions SET ended_at=?, total=?, flagged=?, status='done' WHERE id=?",
            (int(time.time()), len(files), flagged, session_id)
        )

    conn.commit()
    return {"total": len(files), "flagged": flagged}
```

---

### 1.5 — Auto-Delete Job (`backend/app/jobs/auto_delete.py`)

```python
import time
from app.db.database import get_conn
from app.actions.delete import delete_file

THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30

def run_auto_delete():
    conn = get_conn()
    cutoff = int(time.time()) - THIRTY_DAYS_SECONDS

    rows = conn.execute("""
        SELECT f.id, f.path FROM files f
        WHERE f.status = 'quarantined'
          AND f.quarantined_at IS NOT NULL
          AND f.quarantined_at < ?
    """, (cutoff,)).fetchall()

    for (file_id, path) in rows:
        delete_file(path)
        conn.execute(
            "UPDATE files SET status='deleted', deleted_at=? WHERE id=?",
            (int(time.time()), file_id)
        )

    conn.commit()
    return len(rows)
```

---

### 1.6 — FastAPI App (`backend/app/api.py`)

```python
import time
import threading
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler

from app.db.database import get_conn
from app.db.models import init_db
from app.db.migrate import run_migrations
from app.scanner.scan import scan_folder
from app.actions.move import move_to_quarantine
from app.actions.delete import delete_file
from app.jobs.auto_delete import run_auto_delete
from app.config import QUARANTINE_DIR

app = FastAPI(title="NSFW Scanner API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    conn = get_conn()
    init_db(conn)
    run_migrations(conn)

    scheduler = BackgroundScheduler()
    scheduler.add_job(run_auto_delete, "interval", hours=24)
    scheduler.start()

# ── Models ───────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    folder: str

class ActionRequest(BaseModel):
    file_ids: list[int]

# ── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0"}

# ── Scan ─────────────────────────────────────────────────────────────────────

_scan_status = {"running": False, "progress": 0, "total": 0, "flagged": 0}

@app.post("/scan")
def start_scan(req: ScanRequest):
    target = Path(req.folder)
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=400, detail="Invalid directory path")

    if _scan_status["running"]:
        raise HTTPException(status_code=409, detail="Scan already in progress")

    conn = get_conn()
    session = conn.execute(
        "INSERT INTO scan_sessions (folder, started_at, status) VALUES (?, ?, 'running')",
        (str(target), int(time.time()))
    )
    conn.commit()
    session_id = session.lastrowid

    def run():
        _scan_status["running"] = True
        result = scan_folder(target, session_id)
        _scan_status.update({"running": False, **result})

    threading.Thread(target=run, daemon=True).start()
    return {"status": "started", "session_id": session_id}

@app.get("/scan/status")
def scan_status():
    return _scan_status

# ── Results ──────────────────────────────────────────────────────────────────

@app.get("/results")
def get_results(
    decision: Optional[str] = Query(None),
    folder: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    limit: int = Query(100),
    offset: int = Query(0),
):
    conn = get_conn()
    filters = ["r.decision != 'safe'"]
    params = []

    if decision:
        filters.append("r.decision = ?")
        params.append(decision)
    if folder:
        filters.append("f.folder = ?")
        params.append(folder)
    if status:
        filters.append("f.status = ?")
        params.append(status)

    where = " AND ".join(filters)

    rows = conn.execute(f"""
        SELECT f.id, f.path, f.folder, f.status, f.quarantined_at,
               r.decision, r.score, r.classes, r.created_at
        FROM results r
        JOIN files f ON r.file_id = f.id
        WHERE {where}
        ORDER BY r.score DESC
        LIMIT ? OFFSET ?
    """, (*params, limit, offset)).fetchall()

    total = conn.execute(f"""
        SELECT COUNT(*) FROM results r
        JOIN files f ON r.file_id = f.id
        WHERE {where}
    """, params).fetchone()[0]

    return {
        "total": total,
        "items": [
            {
                "id": r[0], "path": r[1], "folder": r[2],
                "status": r[3], "quarantined_at": r[4],
                "decision": r[5], "score": r[6],
                "classes": r[7], "created_at": r[8],
            }
            for r in rows
        ]
    }

# ── Image Serving ─────────────────────────────────────────────────────────────

@app.get("/image")
def serve_image(path: str = Query(...)):
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(p))

# ── Quarantine ────────────────────────────────────────────────────────────────

@app.post("/quarantine")
def quarantine_files(req: ActionRequest):
    conn = get_conn()
    moved = []

    for file_id in req.file_ids:
        row = conn.execute("SELECT path FROM files WHERE id=?", (file_id,)).fetchone()
        if not row:
            continue
        new_path = move_to_quarantine(row[0])
        conn.execute(
            "UPDATE files SET status='quarantined', path=?, quarantined_at=? WHERE id=?",
            (new_path, int(time.time()), file_id)
        )
        moved.append({"id": file_id, "new_path": new_path})

    conn.commit()
    return {"moved": moved}

@app.post("/restore")
def restore_files(req: ActionRequest):
    """Move files back from quarantine to original folder (best-effort)."""
    conn = get_conn()
    restored = []

    for file_id in req.file_ids:
        row = conn.execute(
            "SELECT path, folder FROM files WHERE id=?", (file_id,)
        ).fetchone()
        if not row:
            continue

        src = Path(row[0])
        dst = Path(row[1]) / src.name

        try:
            import shutil
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dst))
            conn.execute(
                "UPDATE files SET status='active', path=?, quarantined_at=NULL WHERE id=?",
                (str(dst), file_id)
            )
            restored.append({"id": file_id, "path": str(dst)})
        except Exception as e:
            print(f"Restore failed for {src}: {e}")

    conn.commit()
    return {"restored": restored}

# ── Delete ────────────────────────────────────────────────────────────────────

@app.delete("/delete")
def delete_files(req: ActionRequest):
    conn = get_conn()
    deleted = []

    for file_id in req.file_ids:
        row = conn.execute("SELECT path FROM files WHERE id=?", (file_id,)).fetchone()
        if not row:
            continue
        delete_file(row[0])
        conn.execute(
            "UPDATE files SET status='deleted', deleted_at=? WHERE id=?",
            (int(time.time()), file_id)
        )
        deleted.append(file_id)

    conn.commit()
    return {"deleted": deleted}

# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/stats")
def get_stats():
    conn = get_conn()

    totals = conn.execute("""
        SELECT r.decision, COUNT(*) as cnt
        FROM results r
        JOIN files f ON r.file_id = f.id
        WHERE f.status = 'active'
        GROUP BY r.decision
    """).fetchall()

    quarantined_count = conn.execute(
        "SELECT COUNT(*) FROM files WHERE status='quarantined'"
    ).fetchone()[0]

    sessions = conn.execute(
        "SELECT * FROM scan_sessions ORDER BY started_at DESC LIMIT 5"
    ).fetchall()

    return {
        "decisions": {row[0]: row[1] for row in totals},
        "quarantined": quarantined_count,
        "recent_sessions": sessions,
    }

# ── Folders ───────────────────────────────────────────────────────────────────

@app.get("/folders")
def get_folders():
    conn = get_conn()
    rows = conn.execute(
        "SELECT DISTINCT folder, COUNT(*) as cnt FROM files GROUP BY folder"
    ).fetchall()
    return [{"folder": r[0], "count": r[1]} for r in rows]
```

---

### 1.7 — Updated `move_to_quarantine` with folder structure preservation (`backend/app/actions/move.py`)

```python
import shutil
from pathlib import Path
from app.config import QUARANTINE_DIR

def move_to_quarantine(path: str) -> str:
    src = Path(path)
    # Preserve subdirectory structure inside quarantine
    try:
        relative = src.relative_to(src.anchor)
    except ValueError:
        relative = Path(src.name)

    dst = QUARANTINE_DIR / relative
    dst.parent.mkdir(parents=True, exist_ok=True)

    shutil.move(str(src), str(dst))
    return str(dst)
```

---

### 1.8 — Start script (`backend/run_backend.py`)

```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.api:app", host="0.0.0.0", port=8000, reload=True)
```

---

## 🖥️ PHASE 2 — FRONTEND (Vite + React + shadcn/ui)

### 2.1 — Bootstrap

```bash
cd frontend
pnpm create vite . --template react-ts
pnpm add tailwindcss postcss autoprefixer
pnpm add @tanstack/react-query axios
pnpm add clsx tailwind-merge class-variance-authority lucide-react
pnpm add react-router-dom
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button badge card dialog progress toast
pnpm dlx shadcn@latest add dropdown-menu select checkbox separator skeleton
```

---

### 2.2 — `frontend/vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
```

---

### 2.3 — `frontend/src/api/client.ts`

```ts
import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

// ── Types ──────────────────────────────────────────────────────────────────

export type Decision = "explicit" | "borderline" | "safe";
export type FileStatus = "active" | "quarantined" | "deleted";

export interface ScanResult {
  id: number;
  path: string;
  folder: string;
  status: FileStatus;
  quarantined_at: number | null;
  decision: Decision;
  score: number;
  classes: string;
  created_at: number;
}

export interface Stats {
  decisions: Record<string, number>;
  quarantined: number;
  recent_sessions: unknown[];
}

// ── API calls ──────────────────────────────────────────────────────────────

export const startScan = (folder: string) =>
  api.post("/scan", { folder });

export const getScanStatus = () =>
  api.get("/scan/status");

export const getResults = (params?: {
  decision?: string;
  folder?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => api.get<{ total: number; items: ScanResult[] }>("/results", { params });

export const getStats = () => api.get<Stats>("/stats");

export const getFolders = () =>
  api.get<{ folder: string; count: number }[]>("/folders");

export const quarantineFiles = (file_ids: number[]) =>
  api.post("/quarantine", { file_ids });

export const restoreFiles = (file_ids: number[]) =>
  api.post("/restore", { file_ids });

export const deleteFiles = (file_ids: number[]) =>
  api.delete("/delete", { data: { file_ids } });

export const imageUrl = (path: string) =>
  `/api/image?path=${encodeURIComponent(path)}`;
```

---

### 2.4 — Design System

**Color palette** (dark, security-focused theme reminiscent of high-end enterprise tools):

```css
/* frontend/src/index.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-base:       #0a0b0e;
  --bg-surface:    #111318;
  --bg-elevated:   #1a1d25;
  --border:        #1f2330;
  --text-primary:  #e8eaf0;
  --text-muted:    #5a6078;
  --accent:        #4f6ef7;
  --accent-hover:  #6b85ff;
  --explicit:      #ef4444;
  --borderline:    #f59e0b;
  --safe:          #10b981;
  --quarantine:    #8b5cf6;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: 'DM Sans', sans-serif;
}
```

---

### 2.5 — Sidebar (`frontend/src/components/layout/Sidebar.tsx`)

```tsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ScanLine, Image,
  Archive, Settings, Shield
} from "lucide-react";

const links = [
  { to: "/",          icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/scan",      icon: ScanLine,        label: "Scan"       },
  { to: "/review",    icon: Image,           label: "Review"     },
  { to: "/quarantine",icon: Archive,         label: "Quarantine" },
  { to: "/settings",  icon: Settings,        label: "Settings"   },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-56 border-r flex flex-col"
           style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b"
           style={{ borderColor: "var(--border)" }}>
        <Shield size={20} style={{ color: "var(--accent)" }} />
        <span className="font-semibold tracking-tight text-sm">NSFW Scanner</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                isActive
                  ? "text-white font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`
            }
            style={({ isActive }) =>
              isActive ? { background: "var(--accent)", color: "#fff" } : {}
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
        v2.0 — Local Only
      </div>
    </aside>
  );
}
```

---

### 2.6 — Dashboard Page (`frontend/src/pages/Dashboard.tsx`)

```tsx
import { useQuery } from "@tanstack/react-query";
import { getStats, getFolders } from "@/api/client";
import { ShieldAlert, Archive, FolderOpen, CheckCircle } from "lucide-react";

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => getStats().then(r => r.data) });
  const { data: folders } = useQuery({ queryKey: ["folders"], queryFn: () => getFolders().then(r => r.data) });

  const decisions = stats?.decisions ?? {};

  const statCards = [
    { label: "Explicit",    value: decisions.explicit    ?? 0, color: "var(--explicit)",   icon: ShieldAlert },
    { label: "Borderline",  value: decisions.borderline  ?? 0, color: "var(--borderline)", icon: ShieldAlert },
    { label: "Safe",        value: decisions.safe        ?? 0, color: "var(--safe)",       icon: CheckCircle },
    { label: "Quarantined", value: stats?.quarantined    ?? 0, color: "var(--quarantine)", icon: Archive     },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Summary of all scanned content
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div key={label}
               className="rounded-xl p-5 flex items-start gap-4"
               style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Scanned folders */}
      <div className="rounded-xl p-5"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
          <FolderOpen size={15} />
          Scanned Folders
        </h2>
        {(folders ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No folders scanned yet. Start a scan to see results.
          </p>
        ) : (
          <div className="space-y-2">
            {(folders ?? []).map(f => (
              <div key={f.folder}
                   className="flex items-center justify-between py-2 px-3 rounded-lg"
                   style={{ background: "var(--bg-elevated)" }}>
                <span className="text-sm font-mono truncate" style={{ color: "var(--text-muted)" }}>
                  {f.folder}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent)20", color: "var(--accent)" }}>
                  {f.count} files
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 2.7 — Scan Page (`frontend/src/pages/Scan.tsx`)

```tsx
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startScan, getScanStatus } from "@/api/client";
import { FolderOpen, Play, Loader2 } from "lucide-react";

export function Scan() {
  const [folder, setFolder] = useState("");
  const qc = useQueryClient();

  const { mutate: scan, isPending } = useMutation({
    mutationFn: () => startScan(folder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scanStatus"] }),
  });

  const { data: status, refetch } = useQuery({
    queryKey: ["scanStatus"],
    queryFn: () => getScanStatus().then(r => r.data),
    refetchInterval: (data) => (data?.running ? 1000 : false),
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold">Start Scan</h1>
      <p className="text-sm mt-1 mb-8" style={{ color: "var(--text-muted)" }}>
        Enter a folder path to scan for NSFW content
      </p>

      <div className="rounded-xl p-6 space-y-5"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>

        {/* Path input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Folder Path</label>
          <div className="flex gap-2">
            <input
              value={folder}
              onChange={e => setFolder(e.target.value)}
              placeholder="C:\Users\YourName\Pictures  or  /home/user/images"
              className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)"
              }}
            />
          </div>
        </div>

        {/* Scan button */}
        <button
          onClick={() => scan()}
          disabled={!folder || isPending || status?.running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {status?.running ? (
            <><Loader2 size={15} className="animate-spin" /> Scanning…</>
          ) : (
            <><Play size={15} /> Start Scan</>
          )}
        </button>

        {/* Status */}
        {status?.running && (
          <div className="text-sm p-3 rounded-lg"
               style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
            Scanning in progress… {status.flagged} flagged so far
          </div>
        )}

        {!status?.running && status?.total > 0 && (
          <div className="text-sm p-3 rounded-lg"
               style={{ background: "var(--safe)15", border: "1px solid var(--safe)30" }}>
            ✓ Last scan: <strong>{status.total}</strong> files scanned,{" "}
            <strong style={{ color: "var(--explicit)" }}>{status.flagged}</strong> flagged
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 2.8 — Review Page (`frontend/src/pages/Review.tsx`)

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getResults, quarantineFiles, deleteFiles, imageUrl, ScanResult } from "@/api/client";
import { Archive, Trash2, CheckSquare, Square } from "lucide-react";

const DECISION_COLORS: Record<string, string> = {
  explicit:   "var(--explicit)",
  borderline: "var(--borderline)",
  safe:       "var(--safe)",
};

export function Review() {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["results", filter],
    queryFn: () => getResults({
      decision: filter !== "all" ? filter : undefined,
      status: "active",
      limit: 200
    }).then(r => r.data),
  });

  const { mutate: quarantine } = useMutation({
    mutationFn: (ids: number[]) => quarantineFiles(ids),
    onSuccess: () => { setSelected(new Set()); qc.invalidateQueries({ queryKey: ["results"] }); }
  });

  const { mutate: deleteSelected } = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: () => { setSelected(new Set()); qc.invalidateQueries({ queryKey: ["results"] }); }
  });

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const items = data?.items ?? [];
  const selArray = [...selected];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {data?.total ?? 0} flagged images
          </p>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {selected.size} selected
            </span>
            <button
              onClick={() => quarantine(selArray)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--quarantine)20", color: "var(--quarantine)", border: "1px solid var(--quarantine)40" }}
            >
              <Archive size={13} /> Quarantine
            </button>
            <button
              onClick={() => deleteSelected(selArray)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--explicit)20", color: "var(--explicit)", border: "1px solid var(--explicit)40" }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {["all", "explicit", "borderline"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-md text-sm capitalize transition-all"
            style={filter === f
              ? { background: "var(--accent)", color: "#fff" }
              : { color: "var(--text-muted)" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl animate-pulse"
                 style={{ background: "var(--bg-surface)" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--text-muted)" }}>
          <p className="text-lg">No flagged images found</p>
          <p className="text-sm mt-1">Run a scan to detect NSFW content</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item: ScanResult) => (
            <ImageCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => toggle(item.id)}
              onQuarantine={() => quarantine([item.id])}
              onDelete={() => deleteSelected([item.id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({
  item, selected, onToggle, onQuarantine, onDelete
}: {
  item: ScanResult;
  selected: boolean;
  onToggle: () => void;
  onQuarantine: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = DECISION_COLORS[item.decision] ?? "var(--text-muted)";

  return (
    <div
      className="relative group rounded-xl overflow-hidden cursor-pointer"
      style={{
        border: selected ? `2px solid var(--accent)` : `2px solid var(--border)`,
        background: "var(--bg-surface)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="aspect-square overflow-hidden">
        <img
          src={imageUrl(item.path)}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.04)" : "scale(1)" }}
        />
      </div>

      {/* Select checkbox */}
      <div
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: selected ? 1 : undefined }}
        onClick={e => { e.stopPropagation(); onToggle(); }}
      >
        {selected
          ? <CheckSquare size={18} style={{ color: "var(--accent)" }} />
          : <Square size={18} style={{ color: "white", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} />
        }
      </div>

      {/* Decision badge */}
      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-medium"
           style={{ background: `${color}30`, color, backdropFilter: "blur(4px)" }}>
        {(item.score * 100).toFixed(0)}%
      </div>

      {/* Hover overlay */}
      {hovered && (
        <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1.5 justify-center"
             style={{ background: "linear-gradient(transparent, rgba(0,0,0,.85))" }}>
          <button
            onClick={e => { e.stopPropagation(); onQuarantine(); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium"
            style={{ background: "var(--quarantine)30", color: "var(--quarantine)" }}
          >
            <Archive size={11} /> Quarantine
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium"
            style={{ background: "var(--explicit)30", color: "var(--explicit)" }}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 2.9 — Quarantine Page (`frontend/src/pages/Quarantine.tsx`)

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getResults, restoreFiles, deleteFiles, imageUrl, ScanResult } from "@/api/client";
import { RotateCcw, Trash2, Clock } from "lucide-react";

function daysLeft(quarantinedAt: number | null): number {
  if (!quarantinedAt) return 0;
  const elapsed = (Date.now() / 1000 - quarantinedAt);
  return Math.max(0, 30 - Math.floor(elapsed / 86400));
}

export function Quarantine() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["quarantine"],
    queryFn: () => getResults({ status: "quarantined", limit: 200 }).then(r => r.data),
  });

  const { mutate: restore } = useMutation({
    mutationFn: (ids: number[]) => restoreFiles(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quarantine"] }),
  });

  const { mutate: deletePermanent } = useMutation({
    mutationFn: (ids: number[]) => deleteFiles(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quarantine"] }),
  });

  const items = data?.items ?? [];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quarantine</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Files are permanently deleted after 30 days
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--text-muted)" }}>
          Quarantine is empty
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item: ScanResult) => {
            const days = daysLeft(item.quarantined_at);
            const urgent = days <= 3;

            return (
              <div key={item.id}
                   className="rounded-xl overflow-hidden"
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="aspect-square">
                  <img src={imageUrl(item.path)} alt="" className="w-full h-full object-cover opacity-60" />
                </div>

                <div className="p-3 space-y-2">
                  {/* Days counter */}
                  <div className="flex items-center gap-1.5 text-xs"
                       style={{ color: urgent ? "var(--explicit)" : "var(--text-muted)" }}>
                    <Clock size={11} />
                    {days > 0 ? `${days}d until auto-delete` : "Deleting soon"}
                  </div>

                  <p className="text-xs truncate font-mono"
                     style={{ color: "var(--text-muted)" }}
                     title={item.path}>
                    {item.path.split(/[\\/]/).pop()}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => restore([item.id])}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
                    >
                      <RotateCcw size={11} /> Restore
                    </button>
                    <button
                      onClick={() => deletePermanent([item.id])}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs"
                      style={{ background: "var(--explicit)20", color: "var(--explicit)" }}
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

### 2.10 — App Router (`frontend/src/App.tsx`)

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { Scan } from "@/pages/Scan";
import { Review } from "@/pages/Review";
import { Quarantine } from "@/pages/Quarantine";

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-56 flex-1 min-h-screen" style={{ background: "var(--bg-base)" }}>
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/scan"       element={<Scan />} />
              <Route path="/review"     element={<Review />} />
              <Route path="/quarantine" element={<Quarantine />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## 🔄 PHASE 3 — ONE-REPO LAUNCH SCRIPTS

### `start.sh` (Linux / macOS)

```bash
#!/bin/bash
echo "🛡️ Starting NSFW Scanner..."

# Backend
cd backend
pip install -r requirements.txt -q
uvicorn app.api:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Frontend
cd ../frontend
pnpm install -q
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "✅ Backend  → http://localhost:8000"
echo "✅ Frontend → http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
```

### `start.bat` (Windows)

```batch
@echo off
echo 🛡️ Starting NSFW Scanner...

start "NSFW Backend" cmd /k "cd backend && pip install -r requirements.txt && uvicorn app.api:app --host 0.0.0.0 --port 8000"
timeout /t 3

start "NSFW Frontend" cmd /k "cd frontend && pnpm install && pnpm dev"

echo.
echo Backend  -^> http://localhost:8000
echo Frontend -^> http://localhost:5173
echo.
pause
```

---

## 🧠 PHASE 4 — ADVANCED FEATURES (Post-MVP)

| Feature | Implementation Notes |
|---|---|
| **Duplicate detection** | Add `hash TEXT` index on `files`; compare SHA-256 before scanning |
| **Scan sessions history** | Expose `GET /sessions` from the `scan_sessions` table |
| **Incremental re-scan** | Already in place via `mtime` check in `scan.py` |
| **Folder filtering in Review** | `GET /results?folder=...` already supported |
| **Export report** | `GET /export/csv` endpoint, stream CSV via `StreamingResponse` |
| **GPU toggle in Settings** | Pass `providers` list to `ort.InferenceSession` based on user config |
| **Dark/Light theme toggle** | Toggle CSS class on `<html>`, store in `localStorage` |
| **Drag & drop folder** | Read `event.dataTransfer.files[0].path` on the Scan page |

---

## ⚠️ CODEX EXECUTION RULES

```
DO NOT use Electron
DO NOT use Streamlit
DO NOT rewrite backend in Node.js
DO NOT break existing ONNX inference pipeline
ALWAYS update DB status on every file action
ALWAYS preserve original folder structure in quarantine
ALWAYS serve images via /api/image?path=... (never expose raw filesystem)
ALWAYS run migrations before API start
PRESERVE all existing scanner logic in backend/app/scanner/
```

---

## 🚀 QUICKSTART (After Codex Finishes)

```bash
# 1. Clone & enter repo
git clone <repo-url> && cd nsfw-scanner

# 2. Drop model
cp /path/to/nudenet.onnx backend/models/nudenet.onnx

# 3. Start everything
chmod +x start.sh && ./start.sh   # Linux/Mac
start.bat                          # Windows

# 4. Open browser
open http://localhost:5173
```

---

*End of Migration Plan — Hand this file to Codex as the single source of truth.*
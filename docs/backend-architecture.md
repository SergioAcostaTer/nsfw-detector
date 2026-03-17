# Backend Architecture

The backend is split into API, application, domain, infrastructure, and shared layers.

- `app/main.py` bootstraps FastAPI, middleware, routers, startup, and shutdown.
- `app/api/routes/*` owns HTTP concerns only.
- `app/application/jobs/*` owns in-memory job queue registration and execution.
- `app/domain/scan/*` owns scan orchestration and stage logic.
- `app/infrastructure/db/repositories/*` owns SQL access.
- `app/infrastructure/video/*` and `app/infrastructure/cache/*` own low-level video and thumbnail services.
- `app/shared/*` owns time helpers and logging.

Compatibility modules remain in `app/scanner/*` and `app/api/__init__.py` so the existing entrypoints continue to work while the internals are migrated.

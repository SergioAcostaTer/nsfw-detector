# Backend Architecture

See also:
- [Docs Index](./README.md)
- [Scan Pipeline](./scan-pipeline.md)
- [Data Model](./data-model.md)
- [API Reference](./api-reference.md)
- [Operations Guide](./operations.md)

## Purpose

The backend is the local moderation engine. It discovers media, runs detection, persists state in SQLite, exposes the review/quarantine APIs, coordinates long-running jobs, and recovers interrupted scans after restart.

The design goal is practical maintainability:

- routes stay thin
- SQL stays in repositories
- scan logic stays in domain services
- long-running execution stays in the job layer

## Layer Ownership

### `app/main.py`

Application bootstrap:

- creates the FastAPI app
- installs middleware
- initializes schema and migrations
- registers job handlers
- recovers running sessions
- starts scheduled auto-delete

### `app/api/`

HTTP contract layer.

Responsibilities:

- request parsing
- response shaping
- status codes
- endpoint compatibility

Important modules:

- `routes/scan.py`
- `routes/results.py`
- `routes/quarantine.py`
- `routes/settings.py`
- `routes/sessions.py`
- `routes/export.py`
- `routes/admin.py`
- `schemas.py`

### `app/application/jobs/`

Long-running job execution layer.

Responsibilities:

- queueing
- worker lifecycle
- progress
- cancellation
- startup recovery

Important modules:

- `queue.py`
- `registry.py`

### `app/domain/scan/`

Core scan orchestration.

Responsibilities:

- discovery
- manifest lookup
- skip-unchanged logic
- image loading
- inference batching
- video aggregation
- persistence orchestration
- progress metrics

Important modules:

- `scan_service.py`
- `discovery_service.py`
- `media_loader.py`
- `inference_service.py`
- `result_writer.py`
- `progress_service.py`
- `video_scan_service.py`

### `app/domain/media/`

Media rules and identity.

Responsibilities:

- image vs video classification
- supported extension logic
- fingerprint and identity generation

### `app/infrastructure/`

Low-level adapters.

Responsibilities:

- SQLite connections and repositories
- thumbnail generation
- video frame sampling
- detector runtime integration

### `app/shared/`

Cross-cutting concerns:

- time helpers
- logging
- small utility code

## Request Flow

Typical scan flow:

1. route receives `POST /scan` or `POST /scan/pc`
2. a `scan_sessions` row is created in SQLite
3. a queue job is enqueued
4. the registry calls the scan service
5. results are written in chunks
6. the session is finalized
7. the frontend polls `GET /scan/status`

Typical review flow:

1. frontend requests latest effective results
2. repository projects the latest row per file
3. user actions mutate SQLite through API endpoints
4. frontend invalidates and reconciles with backend truth

## Why SQLite Works

SQLite is a good fit because the app is:

- local-first
- single-user
- operationally simple
- mostly bounded by filesystem and ML inference, not network concurrency

Repository boundaries also make a future database migration less painful if the product ever changes scope.

## Recovery Model

The queue is in memory, but scan sessions are durable.

That means:

- process-local jobs disappear on shutdown
- `scan_sessions` rows remain
- on startup, running sessions are re-enqueued
- persisted `scan_mode` is preserved
- unchanged-file skipping makes the recovered job behave like a practical resume

This is intentionally operational resume, not byte-level checkpointing.

## Extension Points

This layout is meant to support:

- model plugins
- detector profiles
- deduplication
- watch mode
- richer video event metadata
- audit trails

## Related Reading

- [Scan Pipeline](./scan-pipeline.md)
- [Data Model](./data-model.md)
- [API Reference](./api-reference.md)
- [Operations Guide](./operations.md)

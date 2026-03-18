# Operations Guide

See also:
- [Docs Index](./README.md)
- [Backend Architecture](./backend-architecture.md)
- [Scan Pipeline](./scan-pipeline.md)
- [API Reference](./api-reference.md)

## Scope

This guide is for running, validating, recovering, and troubleshooting the app as local software.

## Runtime Model

The app consists of:

- FastAPI backend
- React/Vite frontend
- SQLite database
- local quarantine vault
- local media files on disk

There is no cloud dependency in the normal path.

## Startup Sequence

On backend startup:

1. quarantine directory is created if needed
2. schema and migrations are applied
3. job handlers are registered
4. interrupted running sessions are recovered
5. auto-delete scheduling is started

## Restart Recovery

If the app closes mid-scan:

- queue memory is lost
- `scan_sessions` still persists

On next startup:

- running sessions are found
- they are re-enqueued
- the saved `scan_mode` is preserved
- unchanged-file skipping prevents pointless rework

This is practical resume behavior rather than low-level checkpointing.

## Scan Modes

Available trigger-time modes:

- `images`
- `videos`
- `both`

Recommended default:

- `images`

Reason:

- video scanning is much slower and should be deliberate

## Quarantine Lifecycle

Quarantine is reversible:

1. file is moved into the vault
2. SQLite marks it quarantined
3. user can restore it
4. or retention-based auto-delete removes it later

The retention period is controlled by `auto_delete_days`.

## Validation Commands

Backend import smoke test:

```powershell
cd backend
..\venv\Scripts\python.exe -c "from app.api import app; print('OK')"
```

Frontend typecheck:

```powershell
cd frontend
npx tsc --noEmit
```

Recommended additional checks:

```powershell
cd backend
pytest
ruff check .
black --check .
```

```powershell
cd frontend
npm run lint
```

## Troubleshooting

### A scan seems stuck

Check:

- `GET /scan/status`
- backend logs
- whether large videos are being sampled

### Review data looks stale

Check:

- frontend cache invalidation
- whether the backend was restarted after code changes
- whether SQLite still contains older authoritative state

### Mark as Safe looks wrong

Check:

- safe override insertion
- latest-result projection logic
- `GET /results/safe`

### Recovery did not resume a scan

Check:

- `scan_sessions.status`
- whether the original folder still exists
- startup logs for recovery

## Reset

The admin reset path:

- clears queue state
- removes SQLite files
- recreates the schema

Use it for support/debugging, not as a routine operator flow.

## Product-Quality Operational Goals

For this app, strong operations means:

- predictable startup
- recoverable scans
- reversible moderation actions
- easy validation
- low-friction reset for debugging

## Related Reading

- [Backend Architecture](./backend-architecture.md)
- [Scan Pipeline](./scan-pipeline.md)
- [API Reference](./api-reference.md)

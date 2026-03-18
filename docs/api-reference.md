# API Reference

See also:
- [Docs Index](./README.md)
- [Data Model](./data-model.md)
- [Operations Guide](./operations.md)

## Overview

This API is local-first and frontend-facing. It is not intended as a public cloud API, but documenting it clearly matters because it is the contract between the React app and the backend.

Base development URL:

- `http://localhost:8000`

In normal development, the frontend reaches it through `/api/...`.

## Health

### `GET /health`

Cheap backend liveness check.

## Scan

### `POST /scan`

Starts a folder scan.

Request:

```json
{
  "folder": "C:\\Users\\John\\Downloads",
  "scan_mode": "images"
}
```

`scan_mode` values:

- `images`
- `videos`
- `both`

Default:

- `images`

Response:

```json
{
  "status": "started",
  "session_id": 12,
  "job_id": "abc123"
}
```

### `POST /scan/pc`

Starts a whole-machine scan.

Request:

```json
{
  "scan_mode": "images"
}
```

### `GET /scan/status`

Returns current scan status.

Query params:

- `job_id` optional

### `POST /scan/cancel`

Cancels the current or specified job.

Query params:

- `job_id` optional

## Results

### `GET /results`

Returns latest effective results per file.

Query params:

- `decision`
- `folder`
- `status`
- `q`
- `limit`
- `offset`

### `GET /results/safe`

Returns user-rescued safe items.

### `GET /results/count`

Returns aggregate decision counts.

### `POST /results/rescue`

Creates durable safe overrides.

Request:

```json
{
  "file_ids": [10, 11, 12]
}
```

### `POST /results/unrescue`

Removes rescue overrides.

### `GET /stats`

Returns:

- decision counts
- quarantine count
- recent sessions

### `GET /folders`

Returns scanned folder summaries.

### `GET /image`

Serves the original file.

### `GET /thumbnail`

Serves a generated thumbnail.

### `GET /file-meta`

Returns OS-level metadata and dimensions when available.

## Quarantine

### `GET /quarantine`

Returns quarantined items.

### `POST /quarantine`

Moves active files to the quarantine vault.

### `POST /restore`

Restores quarantined files.

### `POST /delete`

Permanently deletes files.

### `POST /quarantine/delete-expired`

Runs quarantine cleanup immediately.

## Sessions

### `GET /sessions`

Returns recent scan sessions.

Important fields include:

- `id`
- `folder`
- `scan_mode`
- `started_at`
- `ended_at`
- `total`
- `flagged`
- `status`

### `GET /sessions/{id}/results`

Returns results associated with a session window.

## Settings

### `GET /settings`

Returns current app settings.

### `POST /settings`

Updates app settings.

Important settings include:

- thresholds
- GPU usage
- batch size
- video sampling
- auto-delete retention

## Export

### `GET /export/csv`

Exports results as CSV.

## Admin

### `POST /admin/reset`

Development/support reset.

Behavior:

- clears queue state
- deletes SQLite files
- recreates schema

## Contract Notes

- SQLite is the durable source of truth
- frontend optimistic state must reconcile with backend state
- latest effective result per file is the main operational projection

## Related Reading

- [Data Model](./data-model.md)
- [Operations Guide](./operations.md)

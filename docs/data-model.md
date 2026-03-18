# Data Model

See also:
- [Docs Index](./README.md)
- [Backend Architecture](./backend-architecture.md)
- [Scan Pipeline](./scan-pipeline.md)
- [API Reference](./api-reference.md)

## Overview

The SQLite model is intentionally simple:

- `files` stores canonical file state
- `results` stores decision snapshots
- `scan_sessions` stores scan lifecycle

Operational screens usually work from the latest effective result per file.

## `files`

Canonical media record.

Important columns:

- `id`
- `path`
- `size`
- `mtime`
- `hash`
- `fingerprint`
- `last_scanned_at`
- `folder`
- `status`
- `quarantined_at`
- `deleted_at`
- `type`
- `frame_count`
- `duration`

Important meanings:

- `status`: `active`, `quarantined`, `deleted`
- `type`: `image` or `video`
- `fingerprint`: lightweight identity used for skip-unchanged

## `results`

Decision history for each file.

Important columns:

- `id`
- `file_id`
- `score`
- `decision`
- `classes`
- `created_at`
- `avg_score`
- `max_score`

Important meanings:

- `decision`: current classification for that row
- `classes`: detector evidence or override marker such as `USER_RESCUED`
- `created_at`: millisecond timestamp

### Rescue override model

Marking a file safe does not create a frontend-only flag. It inserts a new `results` row with:

- `decision = 'safe'`
- `classes = 'USER_RESCUED'`

That makes the safe state durable across rescans and restarts.

## `scan_sessions`

Scan lifecycle table.

Important columns:

- `id`
- `folder`
- `scan_mode`
- `started_at`
- `ended_at`
- `total`
- `flagged`
- `status`

Important meanings:

- `scan_mode`: `images`, `videos`, or `both`
- `status`: `running`, `completed`, `cancelled`, `failed`

Persisting `scan_mode` is important so recovered scans restart with the same scope.

## Latest Effective Result

Most review-facing queries do this conceptually:

1. find the latest result row for each file
2. join it to `files`
3. filter by folder, decision, status, or search

Important implementation detail:

- latest-result selection must be deterministic
- ordering by `created_at DESC, id DESC` avoids same-millisecond tie bugs

## Time Standard

Persisted timestamps use milliseconds.

This avoids:

- fast-action collisions
- ambiguous ordering during rescans
- frontend time conversion drift

## Common State Transitions

### Fresh scan hit

- `files.status = active`
- latest `results.decision = explicit` or `borderline`

### User rescue

- `files.status` remains `active`
- latest `results.decision = safe`

### Quarantine

- file is moved to vault
- `files.status = quarantined`
- `files.quarantined_at` is set

### Restore

- file returns to original location
- `files.status = active`

### Permanent delete

- file is removed from disk
- `files.status = deleted`

## Why This Model Works

This schema is small but expressive enough for:

- review
- quarantine lifecycle
- restart recovery
- exports
- safe overrides
- future dedup or audit additions

## Related Reading

- [Backend Architecture](./backend-architecture.md)
- [Scan Pipeline](./scan-pipeline.md)
- [API Reference](./api-reference.md)

# Data Model

SQLite tables:

- `files`
  - stores canonical media record
  - `type` is `image` or `video`
  - `fingerprint` is `size-mtime_ns`
  - `frame_count` and `duration` are used for videos
- `results`
  - stores per-scan latest decision data
  - timestamps are stored in milliseconds
  - includes `avg_score` and `max_score`
- `scan_sessions`
  - stores scan job/session lifecycle
  - timestamps are stored in milliseconds

The UI reads the latest result per file and all queries are built around that projection.

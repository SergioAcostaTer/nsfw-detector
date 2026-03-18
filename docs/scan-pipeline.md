# Scan Pipeline

See also:
- [Docs Index](./README.md)
- [Backend Architecture](./backend-architecture.md)
- [Data Model](./data-model.md)
- [Operations Guide](./operations.md)

## Summary

The scanner is a staged local media pipeline designed for:

- fast incremental rescans
- bounded video resource use
- grouped persistence
- observable progress
- restart recovery

It is intentionally not a monolithic scan loop.

## Stages

### 1. Trigger

Scans start through:

- `POST /scan`
- `POST /scan/pc`

Each scan includes a `scan_mode`:

- `images`
- `videos`
- `both`

Default:

- `images`

### 2. Session creation

Before work starts, a `scan_sessions` row is inserted so the scan has durable identity and can be recovered later.

### 3. Queueing

The request becomes a queue job with:

- target folder or PC mode
- session id
- scan mode

### 4. Discovery

The system walks the filesystem and yields only supported media for the chosen mode.

Important properties:

- generator-based discovery
- no need to materialize the entire tree immediately
- PC scans respect system and user skip folders

### 5. Manifest lookup

For each chunk, the scanner queries SQLite once for existing file state and builds an in-memory path map.

This reduces per-file database roundtrips.

### 6. Skip unchanged

Files are skipped when they are:

- quarantined
- deleted
- unchanged according to current fingerprint/identity rules

This is the key reason rescans remain practical.

### 7. Media split

The pipeline separates:

- images
- videos

This matters because the performance and aggregation model is different for each.

### 8. Image decode

Images are loaded with controlled concurrency before inference.

Relevant settings:

- `max_preload_workers`
- `image_max_dimension`

### 9. Batched inference

Images are sent through the detector in batches.

Key behavior:

- shared ONNX session
- decoded rows from raw detector output
- non-maximum suppression
- class-aware decision logic

### 10. Video scanning

Videos are scanned through sampled frames rather than full decode.

Behavior:

- duration is read
- frames are sampled by FPS or evenly distributed positions
- batches are inferred
- frame batches are discarded after use
- file-level decision is aggregated

Large videos can switch to sparse evenly distributed sampling to contain cost.

### 11. Persistence

Results are written in grouped transactions:

- `files` updates
- `results` inserts
- session counters

Already committed chunks survive interruptions.

### 12. Progress and metrics

Progress is pushed through queue metadata:

- percentage
- current file
- total
- flagged count

The backend also logs stage timings and throughput.

## Restart Recovery

If the app stops mid-scan:

- queue state is lost
- SQLite session state remains

On next startup:

1. running sessions are found
2. jobs are re-enqueued
3. saved `scan_mode` is preserved
4. unchanged files are skipped

This gives practical resume behavior without a complex checkpoint system.

## Performance Levers

Main knobs:

- `batch_size`
- `max_preload_workers`
- `video_fps`
- `max_video_frames_per_file`
- `max_video_size_mb`
- `max_video_duration_seconds`
- `image_max_dimension`

Operationally, image-only scans are the best default because video cost is much higher.

## Related Reading

- [Backend Architecture](./backend-architecture.md)
- [Data Model](./data-model.md)
- [Operations Guide](./operations.md)

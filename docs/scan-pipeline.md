# Scan Pipeline

The scan flow is staged:

1. Discovery
2. Manifest lookup
3. Skip unchanged / quarantined / deleted
4. Media load and decode
5. Preprocess and inference batching
6. Decision and aggregation
7. Persistence in grouped writes
8. Progress reporting and metrics logging

Video scans use streaming frame batches instead of loading all sampled frames into memory at once.

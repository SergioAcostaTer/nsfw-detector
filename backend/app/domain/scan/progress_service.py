from dataclasses import dataclass

from app.shared.utils import now_ms


@dataclass
class ScanMetrics:
    discovery_ms: int = 0
    filtering_ms: int = 0
    load_ms: int = 0
    inference_ms: int = 0
    db_write_ms: int = 0
    total_ms: int = 0
    files_per_second: float = 0.0


class ProgressTracker:
    def __init__(self, total: int = 0, callback=None):
        self.total = total
        self.callback = callback
        self.flagged = 0
        self.processed = 0
        self.started_at = now_ms()
        self.metrics = ScanMetrics()

    def set_total(self, total: int):
        self.total = total

    def increment(self, *, current_file: str, flagged_delta: int = 0):
        self.processed += 1
        self.flagged += flagged_delta
        if self.callback:
            self.callback(index=self.processed, total=self.total, flagged=self.flagged, current_file=current_file)

    def finish(self):
        self.metrics.total_ms = now_ms() - self.started_at
        if self.metrics.total_ms > 0:
            self.metrics.files_per_second = self.processed / (self.metrics.total_ms / 1000)
        return self.metrics

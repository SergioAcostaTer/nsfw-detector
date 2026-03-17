import time


def now_ms() -> int:
    return time.time_ns() // 1_000_000


def now_s() -> int:
    return int(time.time())

import sqlite3

from app.config import DB_PATH

_conn: sqlite3.Connection | None = None


def get_conn():
    global _conn
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.execute("PRAGMA foreign_keys = ON")
        _conn.execute("PRAGMA journal_mode=WAL")
    return _conn

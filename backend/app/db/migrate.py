import sqlite3


def run_migrations(conn):
    existing_cols = [row[1] for row in conn.execute("PRAGMA table_info(files)").fetchall()]
    new_cols = {
        "folder": "TEXT",
        "status": "TEXT DEFAULT 'active'",
        "quarantined_at": "INTEGER",
        "vaulted_at": "INTEGER",
        "deleted_at": "INTEGER",
        "type": "TEXT DEFAULT 'image'",
        "frame_count": "INTEGER DEFAULT 0",
        "duration": "REAL DEFAULT 0",
        "fingerprint": "TEXT",
        "phash": "TEXT",
    }
    for col, definition in new_cols.items():
        if col in existing_cols:
            continue
        try:
            conn.execute(f"ALTER TABLE files ADD COLUMN {col} {definition}")
        except sqlite3.OperationalError as exc:
            print(f"Migration error adding files.{col}: {exc}")

    existing_tables = {
        row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    }
    if "scan_sessions" not in existing_tables:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_sessions (
                id         INTEGER PRIMARY KEY,
                folder     TEXT,
                scan_mode  TEXT DEFAULT 'images',
                started_at INTEGER,
                ended_at   INTEGER,
                total      INTEGER DEFAULT 0,
                flagged    INTEGER DEFAULT 0,
                status     TEXT DEFAULT 'pending'
            )
            """
        )
    else:
        scan_session_cols = [row[1] for row in conn.execute("PRAGMA table_info(scan_sessions)").fetchall()]
        if "scan_mode" not in scan_session_cols:
            try:
                conn.execute("ALTER TABLE scan_sessions ADD COLUMN scan_mode TEXT DEFAULT 'images'")
            except sqlite3.OperationalError as exc:
                print(f"Migration error adding scan_sessions.scan_mode: {exc}")

    results_cols = [row[1] for row in conn.execute("PRAGMA table_info(results)").fetchall()]
    result_new_cols = {
        "avg_score": "REAL DEFAULT 0",
        "max_score": "REAL DEFAULT 0",
    }
    for col, definition in result_new_cols.items():
        if col in results_cols:
            continue
        try:
            conn.execute(f"ALTER TABLE results ADD COLUMN {col} {definition}")
        except sqlite3.OperationalError as exc:
            print(f"Migration error adding results.{col}: {exc}")

    conn.execute("CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_files_phash ON files(phash)")
    conn.commit()

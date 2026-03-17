def run_migrations(conn):
    existing_cols = [row[1] for row in conn.execute("PRAGMA table_info(files)").fetchall()]
    new_cols = {
        "folder": "TEXT",
        "status": "TEXT DEFAULT 'active'",
        "quarantined_at": "INTEGER",
        "deleted_at": "INTEGER",
    }
    for col, definition in new_cols.items():
        if col not in existing_cols:
            conn.execute(f"ALTER TABLE files ADD COLUMN {col} {definition}")

    existing_tables = {
        row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    }
    if "scan_sessions" not in existing_tables:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_sessions (
                id         INTEGER PRIMARY KEY,
                folder     TEXT,
                started_at INTEGER,
                ended_at   INTEGER,
                total      INTEGER DEFAULT 0,
                flagged    INTEGER DEFAULT 0,
                status     TEXT DEFAULT 'running'
            )
            """
        )

    conn.execute("CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash)")
    conn.commit()

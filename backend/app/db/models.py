def init_db(conn):
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS files (
            id              INTEGER PRIMARY KEY,
            path            TEXT UNIQUE,
            size            INTEGER,
            mtime           INTEGER,
            hash            TEXT,
            last_scanned_at INTEGER,
            folder          TEXT,
            status          TEXT DEFAULT 'active',
            quarantined_at  INTEGER,
            deleted_at      INTEGER
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS results (
            id         INTEGER PRIMARY KEY,
            file_id    INTEGER,
            score      REAL,
            decision   TEXT,
            classes    TEXT,
            created_at INTEGER,
            FOREIGN KEY(file_id) REFERENCES files(id)
        )
        """
    )

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

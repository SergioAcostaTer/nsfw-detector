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
            vaulted_at      INTEGER,
            deleted_at      INTEGER,
            type            TEXT DEFAULT 'image',
            frame_count     INTEGER DEFAULT 0,
            duration        REAL DEFAULT 0,
            fingerprint     TEXT,
            phash           TEXT
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
            avg_score  REAL DEFAULT 0,
            max_score  REAL DEFAULT 0,
            FOREIGN KEY(file_id) REFERENCES files(id)
        )
        """
    )

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

    file_columns = {row[1] for row in conn.execute("PRAGMA table_info(files)").fetchall()}
    if "hash" in file_columns:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash)")
    if "phash" in file_columns:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_phash ON files(phash)")
    conn.commit()

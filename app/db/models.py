def init_db(conn):
    conn.execute('''
    CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        path TEXT UNIQUE,
        size INTEGER,
        mtime INTEGER,
        hash TEXT,
        last_scanned_at INTEGER
    )
    ''')

    conn.execute('''
    CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY,
        file_id INTEGER,
        score REAL,
        decision TEXT,
        classes TEXT,
        created_at INTEGER
    )
    ''')

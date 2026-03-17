class SessionsRepository:
    def __init__(self, conn):
        self.conn = conn

    def create_session(self, folder: str, started_at: int):
        cursor = self.conn.execute(
            "INSERT INTO scan_sessions (folder, started_at, status) VALUES (?, ?, 'running')",
            (folder, started_at),
        )
        return cursor.lastrowid

    def finish_session(self, session_id: int, *, ended_at: int, total: int | None = None, flagged: int | None = None, status: str):
        self.conn.execute(
            """
            UPDATE scan_sessions
            SET ended_at=?,
                total=COALESCE(?, total),
                flagged=COALESCE(?, flagged),
                status=?
            WHERE id=?
            """,
            (ended_at, total, flagged, status, session_id),
        )

    def get_recent(self, limit: int = 20):
        rows = self.conn.execute(
            """
            SELECT id, folder, started_at, ended_at, total, flagged, status
            FROM scan_sessions
            ORDER BY started_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [
            {
                "id": row[0],
                "folder": row[1],
                "started_at": row[2],
                "ended_at": row[3],
                "total": row[4],
                "flagged": row[5],
                "status": row[6],
            }
            for row in rows
        ]

    def get_by_id(self, session_id: int):
        row = self.conn.execute(
            "SELECT id, folder, started_at, ended_at, total, flagged, status FROM scan_sessions WHERE id=?",
            (session_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row[0],
            "folder": row[1],
            "started_at": row[2],
            "ended_at": row[3],
            "total": row[4],
            "flagged": row[5],
            "status": row[6],
        }

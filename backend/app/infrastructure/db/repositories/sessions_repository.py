class SessionsRepository:
    def __init__(self, conn):
        self.conn = conn

    def create_session(self, folder: str, started_at: int, scan_mode: str = "images"):
        cursor = self.conn.execute(
            "INSERT INTO scan_sessions (folder, scan_mode, started_at, status) VALUES (?, ?, ?, 'running')",
            (folder, scan_mode, started_at),
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
            SELECT id, folder, scan_mode, started_at, ended_at, total, flagged, status
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
                "scan_mode": row[2],
                "started_at": row[3],
                "ended_at": row[4],
                "total": row[5],
                "flagged": row[6],
                "status": row[7],
            }
            for row in rows
        ]

    def get_running(self):
        rows = self.conn.execute(
            """
            SELECT id, folder, scan_mode, started_at, ended_at, total, flagged, status
            FROM scan_sessions
            WHERE status = 'running'
            ORDER BY started_at ASC
            """
        ).fetchall()
        return [
            {
                "id": row[0],
                "folder": row[1],
                "scan_mode": row[2],
                "started_at": row[3],
                "ended_at": row[4],
                "total": row[5],
                "flagged": row[6],
                "status": row[7],
            }
            for row in rows
        ]

    def get_by_id(self, session_id: int):
        row = self.conn.execute(
            "SELECT id, folder, scan_mode, started_at, ended_at, total, flagged, status FROM scan_sessions WHERE id=?",
            (session_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row[0],
            "folder": row[1],
            "scan_mode": row[2],
            "started_at": row[3],
            "ended_at": row[4],
            "total": row[5],
            "flagged": row[6],
            "status": row[7],
        }

class ResultsRepository:
    def __init__(self, conn):
        self.conn = conn

    def insert_many(self, records: list[dict]):
        self.conn.executemany(
            """
            INSERT INTO results (file_id, score, decision, classes, created_at, avg_score, max_score)
            VALUES (:file_id, :score, :decision, :classes, :created_at, :avg_score, :max_score)
            """,
            records,
        )

    def get_latest_results(self, *, decision=None, folder=None, status="active", limit=100, offset=0, search=None):
        filters = ["r.decision != 'safe'"]
        params: list[object] = []
        if decision:
            filters.append("r.decision = ?")
            params.append(decision)
        if folder:
            filters.append("f.folder = ?")
            params.append(folder)
        if status:
            filters.append("f.status = ?")
            params.append(status)
        if search:
            filters.append("LOWER(f.path) LIKE ?")
            params.append(f"%{search.lower()}%")
        where = " AND ".join(filters)
        rows = self.conn.execute(
            f"""
            SELECT f.id, f.path, f.folder, f.status, f.quarantined_at, f.type, f.frame_count, f.duration,
                   r.decision, r.score, r.classes, r.created_at, r.avg_score, r.max_score
            FROM (
                SELECT file_id, MAX(created_at) AS created_at
                FROM results
                GROUP BY file_id
            ) latest
            JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.created_at
            JOIN files f ON r.file_id = f.id
            WHERE {where}
            ORDER BY r.score DESC
            LIMIT ? OFFSET ?
            """,
            (*params, limit, offset),
        ).fetchall()
        total = self.conn.execute(
            f"""
            SELECT COUNT(*)
            FROM (
                SELECT f.id
                FROM (
                    SELECT file_id, MAX(created_at) AS created_at
                    FROM results
                    GROUP BY file_id
                ) latest
                JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.created_at
                JOIN files f ON r.file_id = f.id
                WHERE {where}
            )
            """,
            params,
        ).fetchone()[0]
        items = [
            {
                "id": row[0],
                "path": row[1],
                "folder": row[2],
                "status": row[3],
                "quarantined_at": row[4],
                "type": row[5],
                "frame_count": row[6],
                "duration": row[7],
                "decision": row[8],
                "score": row[9],
                "classes": row[10],
                "created_at": row[11],
                "avg_score": row[12],
                "max_score": row[13],
            }
            for row in rows
        ]
        return {"total": total, "items": items}

    def get_result_counts(self):
        rows = self.conn.execute(
            """
            SELECT r.decision, COUNT(*) AS cnt
            FROM (SELECT file_id, MAX(created_at) AS ca FROM results GROUP BY file_id) latest
            JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.ca
            JOIN files f ON f.id = r.file_id
            WHERE f.status = 'active' AND r.decision != 'safe'
            GROUP BY r.decision
            """
        ).fetchall()
        return {row[0]: row[1] for row in rows}

    def get_session_results(self, started_at: int, ended_at: int):
        rows = self.conn.execute(
            """
            SELECT f.id, f.path, f.folder, f.status, f.quarantined_at, f.type, f.frame_count, f.duration,
                   r.decision, r.score, r.classes, r.created_at, r.avg_score, r.max_score
            FROM results r
            JOIN files f ON f.id = r.file_id
            WHERE r.decision != 'safe'
              AND r.created_at BETWEEN ? AND ?
            ORDER BY r.score DESC
            """,
            (started_at, ended_at),
        ).fetchall()
        return [
            {
                "id": row[0],
                "path": row[1],
                "folder": row[2],
                "status": row[3],
                "quarantined_at": row[4],
                "type": row[5],
                "frame_count": row[6],
                "duration": row[7],
                "decision": row[8],
                "score": row[9],
                "classes": row[10],
                "created_at": row[11],
                "avg_score": row[12],
                "max_score": row[13],
            }
            for row in rows
        ]

    def get_decision_stats(self):
        rows = self.conn.execute(
            """
            SELECT r.decision, COUNT(*) AS cnt
            FROM (
                SELECT file_id, MAX(created_at) AS created_at
                FROM results
                GROUP BY file_id
            ) latest
            JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.created_at
            JOIN files f ON f.id = r.file_id
            WHERE f.status = 'active'
            GROUP BY r.decision
            """
        ).fetchall()
        return {row[0]: row[1] for row in rows}

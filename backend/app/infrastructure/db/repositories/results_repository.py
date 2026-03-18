class ResultsRepository:
    def __init__(self, conn):
        self.conn = conn

    def _latest_result_join(self) -> str:
        return """
            JOIN results r ON r.id = (
                SELECT r2.id
                FROM results r2
                WHERE r2.file_id = f.id
                ORDER BY r2.created_at DESC, r2.id DESC
                LIMIT 1
            )
        """

    def insert_many(self, records: list[dict]):
        self.conn.executemany(
            """
            INSERT INTO results (file_id, score, decision, classes, created_at, avg_score, max_score)
            VALUES (:file_id, :score, :decision, :classes, :created_at, :avg_score, :max_score)
            """,
            records,
        )

    def insert_safe_overrides(self, file_ids: list[int], *, created_at: int, classes: str = "USER_RESCUED"):
        if not file_ids:
            return
        self.conn.executemany(
            """
            INSERT INTO results (file_id, score, decision, classes, created_at, avg_score, max_score)
            VALUES (?, 0.0, 'safe', ?, ?, 0.0, 0.0)
            """,
            [(file_id, classes, created_at) for file_id in file_ids],
        )

    def delete_safe_overrides(self, file_ids: list[int], *, classes: str = "USER_RESCUED"):
        if not file_ids:
            return
        placeholders = ",".join("?" for _ in file_ids)
        self.conn.execute(
            f"""
            DELETE FROM results
            WHERE file_id IN ({placeholders})
              AND decision = 'safe'
              AND classes = ?
            """,
            (*file_ids, classes),
        )

    def get_latest_results(
        self,
        *,
        decision=None,
        folder=None,
        status="active",
        sort_by="score_desc",
        limit=100,
        offset=0,
        search=None,
        include_safe=False,
        rescued_only=False,
    ):
        filters = []
        params: list[object] = []
        if not include_safe and decision != "safe":
            filters.append("r.decision != 'safe'")
        if decision:
            filters.append("r.decision = ?")
            params.append(decision)
        if rescued_only:
            filters.append("r.classes = ?")
            params.append("USER_RESCUED")
        if folder:
            filters.append("f.folder = ?")
            params.append(folder)
        if status:
            filters.append("f.status = ?")
            params.append(status)
        if search:
            filters.append("LOWER(f.path) LIKE ?")
            params.append(f"%{search.lower()}%")
        where = " AND ".join(filters) if filters else "1=1"
        sort_map = {
            "score_desc": "r.score DESC, r.created_at DESC",
            "score_asc": "r.score ASC, r.created_at DESC",
            "date_desc": "f.mtime DESC, r.id DESC",
            "date_asc": "f.mtime ASC, r.id ASC",
            "name_asc": "f.path ASC",
            "name_desc": "f.path DESC",
        }
        order_clause = sort_map.get(sort_by, "r.score DESC, r.created_at DESC")
        rows = self.conn.execute(
            f"""
            SELECT f.id, f.path, f.folder, f.status, f.quarantined_at, f.type, f.frame_count, f.duration,
                   r.decision, r.score, r.classes, r.created_at, r.avg_score, r.max_score
            FROM files f
            {self._latest_result_join()}
            WHERE {where}
            ORDER BY {order_clause}
            LIMIT ? OFFSET ?
            """,
            (*params, limit, offset),
        ).fetchall()
        total = self.conn.execute(
            f"""
            SELECT COUNT(*)
            FROM (
                SELECT f.id
                FROM files f
                {self._latest_result_join()}
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
            FROM files f
            JOIN results r ON r.id = (
                SELECT r2.id
                FROM results r2
                WHERE r2.file_id = f.id
                ORDER BY r2.created_at DESC, r2.id DESC
                LIMIT 1
            )
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
            FROM files f
            JOIN results r ON r.id = (
                SELECT r2.id
                FROM results r2
                WHERE r2.file_id = f.id
                ORDER BY r2.created_at DESC, r2.id DESC
                LIMIT 1
            )
            WHERE f.status = 'active'
            GROUP BY r.decision
            """
        ).fetchall()
        return {row[0]: row[1] for row in rows}

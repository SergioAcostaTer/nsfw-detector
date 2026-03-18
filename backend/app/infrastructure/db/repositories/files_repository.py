from pathlib import Path

HELD_FILE_STATUSES = {"quarantined", "vaulted", "deleted"}


class FilesRepository:
    def __init__(self, conn):
        self.conn = conn

    @staticmethod
    def _existing_file_record(row):
        return {
            "id": row[0],
            "path": row[1],
            "original_path": row[2],
            "status": row[3],
            "mtime": row[4],
            "fingerprint": row[5],
            "hash": row[6],
            "folder": row[7],
            "quarantined_at": row[8],
            "type": row[9],
            "frame_count": row[10],
            "duration": row[11],
            "phash": row[12],
            "vaulted_at": row[13],
        }

    @staticmethod
    def _file_record(row):
        return {
            "id": row[0],
            "path": row[1],
            "original_path": row[2],
            "folder": row[3],
            "status": row[4],
            "quarantined_at": row[5],
            "hash": row[6],
            "type": row[7],
            "frame_count": row[8],
            "duration": row[9],
            "phash": row[10],
            "vaulted_at": row[11],
        }

    def get_existing_by_paths(self, paths: list[str]):
        if not paths:
            return {}
        placeholders = ",".join("?" for _ in paths)
        rows = self.conn.execute(
            f"""
            SELECT id, path, original_path, status, mtime, fingerprint, hash, folder, quarantined_at, type, frame_count, duration
                 , phash, vaulted_at
            FROM files
            WHERE path IN ({placeholders})
            """,
            paths,
        ).fetchall()
        return {row[1]: self._existing_file_record(row) for row in rows}

    def get_by_id(self, file_id: int):
        row = self.conn.execute(
            """
            SELECT id, path, original_path, folder, status, quarantined_at, hash, type, frame_count, duration, phash, vaulted_at
            FROM files
            WHERE id = ?
            """,
            (file_id,),
        ).fetchone()
        return None if row is None else self._file_record(row)

    def upsert_many(self, records: list[dict]):
        self.conn.executemany(
            """
            INSERT INTO files (path, original_path, size, mtime, hash, folder, status, last_scanned_at, quarantined_at, vaulted_at, deleted_at, type, frame_count, duration, fingerprint, phash)
            VALUES (:path, :original_path, :size, :mtime, :hash, :folder, 'active', :last_scanned_at, NULL, NULL, NULL, :type, :frame_count, :duration, :fingerprint, :phash)
            ON CONFLICT(path) DO UPDATE SET
                original_path=excluded.original_path,
                size=excluded.size,
                mtime=excluded.mtime,
                hash=excluded.hash,
                folder=excluded.folder,
                status='active',
                last_scanned_at=excluded.last_scanned_at,
                quarantined_at=NULL,
                vaulted_at=NULL,
                deleted_at=NULL,
                type=excluded.type,
                frame_count=excluded.frame_count,
                duration=excluded.duration,
                fingerprint=excluded.fingerprint,
                phash=excluded.phash
            """,
            records,
        )

    def get_ids_by_paths(self, paths: list[str]):
        if not paths:
            return {}
        placeholders = ",".join("?" for _ in paths)
        rows = self.conn.execute(
            f"SELECT id, path FROM files WHERE path IN ({placeholders})",
            paths,
        ).fetchall()
        return {row[1]: row[0] for row in rows}

    def mark_quarantined(self, file_id: int, new_path: str, quarantined_at: int):
        self.conn.execute(
            "UPDATE files SET status='quarantined', original_path=COALESCE(original_path, path), path=?, quarantined_at=?, vaulted_at=NULL WHERE id=?",
            (new_path, quarantined_at, file_id),
        )

    def mark_vaulted(self, file_id: int, new_path: str, vaulted_at: int):
        self.conn.execute(
            "UPDATE files SET status='vaulted', original_path=COALESCE(original_path, path), path=?, vaulted_at=?, quarantined_at=NULL WHERE id=?",
            (new_path, vaulted_at, file_id),
        )

    def mark_restored(self, file_id: int, restored_path: str):
        self.conn.execute(
            "UPDATE files SET status='active', path=?, original_path=?, quarantined_at=NULL, vaulted_at=NULL WHERE id=?",
            (restored_path, restored_path, file_id),
        )

    def mark_deleted(self, file_id: int, deleted_at: int):
        self.conn.execute(
            "UPDATE files SET status='deleted', deleted_at=? WHERE id=?",
            (deleted_at, file_id),
        )

    def get_folder_summaries(self):
        rows = self.conn.execute(
            """
            SELECT f.folder,
                   COUNT(*) as cnt,
                   SUM(CASE WHEN lr.decision != 'safe' THEN 1 ELSE 0 END) as flagged,
                   MAX(f.last_scanned_at) as last_scanned
            FROM files f
            LEFT JOIN (
                SELECT r1.file_id, r1.decision
                FROM results r1
                JOIN (
                    SELECT file_id, MAX(created_at) AS created_at
                    FROM results
                    GROUP BY file_id
                ) latest ON latest.file_id = r1.file_id AND latest.created_at = r1.created_at
            ) lr ON lr.file_id = f.id
            GROUP BY f.folder
            ORDER BY last_scanned DESC
            """
        ).fetchall()
        return [{"folder": row[0], "count": row[1], "flagged": row[2], "last_scanned": row[3]} for row in rows]

    def count_by_status(self, status: str):
        return self.conn.execute("SELECT COUNT(*) FROM files WHERE status = ?", (status,)).fetchone()[0]

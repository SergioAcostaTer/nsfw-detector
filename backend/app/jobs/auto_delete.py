import time
from sqlite3 import OperationalError

from app.actions.delete import delete_file
from app.db.database import get_conn

DAY_SECONDS = 60 * 60 * 24


def run_auto_delete(days: int = 30):
    conn = get_conn()
    cutoff = int(time.time()) - (DAY_SECONDS * days)

    for attempt in range(2):
        try:
            rows = conn.execute(
                """
                SELECT f.id, f.path FROM files f
                WHERE f.status = 'quarantined'
                  AND f.quarantined_at IS NOT NULL
                  AND f.quarantined_at < ?
                """,
                (cutoff,),
            ).fetchall()

            for file_id, path in rows:
                delete_file(path)
                conn.execute("DELETE FROM results WHERE file_id = ?", (file_id,))
                conn.execute("DELETE FROM files WHERE id = ?", (file_id,))

            conn.commit()
            return len(rows)
        except OperationalError as exc:
            if "database is locked" not in str(exc).lower() or attempt == 1:
                raise
            time.sleep(0.25)
    return 0

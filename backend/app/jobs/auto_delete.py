import time

from app.actions.delete import delete_file
from app.db.database import get_conn

THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30


def run_auto_delete():
    conn = get_conn()
    cutoff = int(time.time()) - THIRTY_DAYS_SECONDS

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

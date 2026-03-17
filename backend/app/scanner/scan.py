import time
from pathlib import Path

import cv2
from tqdm import tqdm

from app.db.database import get_conn
from app.db.models import init_db
from app.scanner.decision import decide
from app.scanner.detector import Detector
from app.scanner.file_utils import hash_file, iter_image_files


def scan_folder(folder: Path, session_id: int | None = None, progress_callback=None):
    conn = get_conn()
    init_db(conn)
    detector = Detector()

    files = iter_image_files(folder)
    flagged = 0

    for index, path in enumerate(tqdm(files), start=1):
        try:
            existing_status = conn.execute(
                "SELECT status, mtime FROM files WHERE path = ?", (str(path),)
            ).fetchone()

            if existing_status and existing_status[0] in ("quarantined", "deleted"):
                if progress_callback:
                    progress_callback(
                        index=index,
                        total=len(files),
                        flagged=flagged,
                        current_file=str(path.name),
                    )
                continue

            stat = path.stat()

            if existing_status and existing_status[1] == stat.st_mtime:
                if progress_callback:
                    progress_callback(
                        index=index,
                        total=len(files),
                        flagged=flagged,
                        current_file=str(path.name),
                    )
                continue

            image = cv2.imread(str(path))
            if image is None:
                if progress_callback:
                    progress_callback(
                        index=index,
                        total=len(files),
                        flagged=flagged,
                        current_file=str(path.name),
                    )
                continue

            file_hash = hash_file(path)
            detections = detector.detect(image)
            decision, score = decide(detections)

            conn.execute(
                """
                INSERT INTO files (path, size, mtime, hash, folder, status, last_scanned_at, deleted_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?, NULL)
                ON CONFLICT(path) DO UPDATE SET
                    size=excluded.size,
                    mtime=excluded.mtime,
                    hash=excluded.hash,
                    folder=excluded.folder,
                    status='active',
                    last_scanned_at=excluded.last_scanned_at,
                    deleted_at=NULL
                """,
                (
                    str(path),
                    stat.st_size,
                    stat.st_mtime,
                    file_hash,
                    str(folder),
                    int(time.time()),
                ),
            )

            file_id = conn.execute(
                "SELECT id FROM files WHERE path = ?", (str(path),)
            ).fetchone()[0]

            conn.execute(
                """
                INSERT INTO results (file_id, score, decision, classes, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (file_id, score, decision, str(detections), int(time.time())),
            )

            if decision != "safe":
                flagged += 1

        except Exception as exc:
            print(f"Error processing {path}: {exc}")
        finally:
            if progress_callback:
                progress_callback(
                    index=index,
                    total=len(files),
                    flagged=flagged,
                    current_file=str(path.name),
                )

    if session_id:
        conn.execute(
            """
            UPDATE scan_sessions
            SET ended_at=?, total=?, flagged=?, status='done'
            WHERE id=?
            """,
            (int(time.time()), len(files), flagged, session_id),
        )

    conn.commit()
    return {"total": len(files), "flagged": flagged}

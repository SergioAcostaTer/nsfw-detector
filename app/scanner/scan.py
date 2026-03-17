import cv2
import time
from pathlib import Path
from tqdm import tqdm

from app.scanner.detector import Detector
from app.scanner.decision import decide
from app.db.database import get_conn
from app.db.models import init_db
from app.config import IMAGE_EXTENSIONS

def scan_folder(folder: Path):
    conn = get_conn()
    init_db(conn)
    detector = Detector()

    files = [p for p in folder.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS]
    print(f"Found {len(files)} images. Starting scan...")
    
    for path in tqdm(files):
        stat = path.stat()
        image = cv2.imread(str(path))
        if image is None:
            continue

        detections = detector.detect(image)
        decision, score = decide(detections)

        conn.execute(
            "INSERT OR REPLACE INTO files (path, size, mtime) VALUES (?, ?, ?)",
            (str(path), stat.st_size, stat.st_mtime)
        )
        file_id = conn.execute("SELECT id FROM files WHERE path = ?", (str(path),)).fetchone()[0]
        
        conn.execute(
            "INSERT INTO results (file_id, score, decision, classes, created_at) VALUES (?, ?, ?, ?, ?)",
            (file_id, score, decision, str(detections), int(time.time()))
        )
        conn.commit()

import os
from collections import deque
from pathlib import Path
from threading import Event

from app.config import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS


def get_scan_roots() -> list[Path]:
    if os.name == "nt":
        roots = [Path(f"{letter}:\\") for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ" if Path(f"{letter}:\\").exists()]
        return roots or [Path.home()]
    return [Path("/")]


def get_default_skip_folders() -> list[Path]:
    home = Path.home()
    if os.name == "nt":
        return [
            Path(os.environ.get("SystemRoot", "C:/Windows")),
            Path(os.environ.get("ProgramFiles", "C:/Program Files")),
            Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")),
            Path(os.environ.get("APPDATA", str(home / "AppData/Roaming"))),
            Path(os.environ.get("LOCALAPPDATA", str(home / "AppData/Local"))),
            home / ".cache",
            home / ".codex",
        ]
    if Path("/System").exists():
        return [
            Path("/System"),
            Path("/Library"),
            Path("/Applications"),
            home / "Library",
            home / ".Trash",
            home / ".cache",
        ]
    return [
        Path("/proc"),
        Path("/sys"),
        Path("/dev"),
        Path("/run"),
        Path("/tmp"),
        Path("/var/cache"),
        Path("/var/tmp"),
        home / ".cache",
        home / ".local/share/Trash",
    ]


def should_skip(path: Path, skip_folders: list[Path]) -> bool:
    path_str = str(path).lower()
    for candidate in skip_folders:
        candidate_str = str(candidate).lower()
        if path_str == candidate_str or path_str.startswith(f"{candidate_str}{os.sep}"):
            return True
    return False


def iter_pc_images(
    roots: list[Path] | None = None,
    *,
    custom_skip_folders: list[str] | None = None,
    cancel_event: Event | None = None,
    progress_callback=None,
) -> list[Path]:
    queue = deque(roots or get_scan_roots())
    files: list[Path] = []
    seen: set[str] = set()
    skip_folders = get_default_skip_folders() + [Path(path) for path in custom_skip_folders or []]

    while queue:
        if cancel_event and cancel_event.is_set():
            break

        current = queue.popleft()
        marker = str(current.resolve(strict=False))
        if marker in seen or should_skip(current, skip_folders):
            continue
        seen.add(marker)

        try:
            if current.is_symlink():
                continue
            if current.is_file():
                if current.suffix.lower() in IMAGE_EXTENSIONS + VIDEO_EXTENSIONS:
                    files.append(current)
                continue

            for child in current.iterdir():
                if child.is_symlink():
                    continue
                queue.append(child)
        except OSError:
            continue

        if progress_callback:
            progress_callback(current=str(current), discovered=len(files))

    return files

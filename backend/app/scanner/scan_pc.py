import os
from collections import deque
from pathlib import Path
from threading import Event

from app.config import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS

LOW_VALUE_DIRECTORY_NAMES = {
    "$recycle.bin",
    ".cache",
    ".codex",
    ".git",
    ".gradle",
    ".idea",
    ".next",
    ".nuxt",
    ".svn",
    ".terraform",
    ".venv",
    ".vscode",
    "__pycache__",
    "appdata",
    "battle.net",
    "blizzard",
    "cache",
    "dist",
    "ea games",
    "epic games",
    "games",
    "gog games",
    "logs",
    "node_modules",
    "program files",
    "program files (x86)",
    "programdata",
    "riot games",
    "steam",
    "steamapps",
    "steamlibrary",
    "temp",
    "tmp",
    "ubisoft",
    "ubisoft game launcher",
    "venv",
    "windows",
    "windowsapps",
    "xboxgames",
}
HIGH_VALUE_DIRECTORY_NAMES = {
    "camera roll",
    "dcim",
    "desktop",
    "documents",
    "downloads",
    "images",
    "media",
    "movies",
    "music",
    "onedrive",
    "photos",
    "pictures",
    "screenshots",
    "videos",
    "whatsapp images",
}


def get_scan_roots() -> list[Path]:
    if os.name == "nt":
        home = Path.home()
        preferred = [
            home / "Desktop",
            home / "Downloads",
            home / "Documents",
            home / "Pictures",
            home / "Videos",
            home / "Music",
            home / "OneDrive",
            home,
        ]
        roots = []
        seen = set()
        for candidate in preferred:
            marker = str(candidate).lower()
            if marker in seen or not candidate.exists():
                continue
            seen.add(marker)
            roots.append(candidate)
        return roots or [home]
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
    if path.is_dir() and path.name.lower() in LOW_VALUE_DIRECTORY_NAMES:
        return True
    return False


def _child_priority(path: Path):
    name = path.name.lower()
    if path.is_dir():
        if name in HIGH_VALUE_DIRECTORY_NAMES:
            return (0, name)
        if name in LOW_VALUE_DIRECTORY_NAMES:
            return (9, name)
        return (3, name)
    suffix = path.suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return (1, name)
    if suffix in VIDEO_EXTENSIONS:
        return (2, name)
    return (8, name)


def iter_pc_images(
    roots: list[Path] | None = None,
    *,
    scan_mode: str = "both",
    custom_skip_folders: list[str] | None = None,
    cancel_event: Event | None = None,
    progress_callback=None,
) -> list[Path]:
    queue = deque(roots or get_scan_roots())
    files: list[Path] = []
    seen: set[str] = set()
    skip_folders = get_default_skip_folders() + [Path(path) for path in custom_skip_folders or []]

    directories_visited = 0
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
                suffix = current.suffix.lower()
                include = (
                    suffix in IMAGE_EXTENSIONS
                    if scan_mode == "images"
                    else suffix in VIDEO_EXTENSIONS
                    if scan_mode == "videos"
                    else suffix in IMAGE_EXTENSIONS + VIDEO_EXTENSIONS
                )
                if include:
                    files.append(current)
                continue

            children = []
            for child in current.iterdir():
                if child.is_symlink():
                    continue
                children.append(child)
            for child in sorted(children, key=_child_priority):
                queue.append(child)
        except OSError:
            continue

        if progress_callback:
            directories_visited += 1
            progress_callback(current=str(current), discovered=len(files), directories_visited=directories_visited)

    return files

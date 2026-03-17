from pathlib import Path

from app.actions.move import move_to_quarantine


def quarantine_path(path: str) -> str:
    return move_to_quarantine(path)


def restore_destination(src_path: str, folder: str) -> Path:
    return Path(folder) / Path(src_path).name

from concurrent.futures import ThreadPoolExecutor

from app.domain.file.file_service import load_image


def load_images(entries: list[dict], *, max_workers: int):
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        images = list(pool.map(lambda entry: load_image(entry["path"]), entries))
    return [(entry, image) for entry, image in zip(entries, images) if image is not None]

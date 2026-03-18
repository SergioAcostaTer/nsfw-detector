from app.domain.storage.storage_service import delete_expired_trashed_files


def run_auto_delete(days: int = 30):
    return delete_expired_trashed_files(days)

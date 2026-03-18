from fastapi import APIRouter

from app.api.schemas import ActionRequest
from app.domain.storage.storage_service import (
    delete_expired_trashed_files,
    delete_files_forever,
    move_files_to_storage,
    restore_files_from_storage,
)
from app.settings import load_settings

router = APIRouter()


@router.post("/vault")
def vault_files(req: ActionRequest):
    return {"moved": move_files_to_storage(req.file_ids, target="vault")}


@router.post("/trash")
def trash_files(req: ActionRequest):
    return {"moved": move_files_to_storage(req.file_ids, target="trash")}


@router.post("/quarantine")
def quarantine_files(req: ActionRequest):
    return trash_files(req)


@router.post("/unvault")
def unvault_files(req: ActionRequest):
    return {"restored": restore_files_from_storage(req.file_ids)}


@router.post("/restore-trash")
def restore_trash_files(req: ActionRequest):
    return {"restored": restore_files_from_storage(req.file_ids)}


@router.post("/restore")
def restore_files(req: ActionRequest):
    return restore_trash_files(req)


@router.delete("/delete")
def delete_files(req: ActionRequest):
    return {"deleted": delete_files_forever(req.file_ids)}


@router.delete("/vault/expired")
def trigger_vault_auto_delete():
    return {"deleted": 0}


@router.delete("/trash/expired")
def trigger_trash_auto_delete():
    return {"deleted": delete_expired_trashed_files(load_settings().get("auto_delete_days", 30))}


@router.delete("/quarantine/expired")
def trigger_auto_delete():
    return trigger_trash_auto_delete()

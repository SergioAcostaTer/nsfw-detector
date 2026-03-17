from fastapi import APIRouter

from app.api.schemas import SettingsRequest
from app.settings import load_settings, save_settings

router = APIRouter()


@router.get("/settings")
def get_settings():
    return load_settings()


@router.put("/settings")
def update_settings(req: SettingsRequest):
    return save_settings(req.model_dump())

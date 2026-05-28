import os
import mimetypes
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from ..database import SHARED_STORAGE_PATH

router = APIRouter()

_SAFE_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._- ()")


def _safe_filename(name: str) -> str:
    cleaned = "".join(c for c in name if c in _SAFE_CHARS)
    cleaned = cleaned.strip(". ")
    if not cleaned:
        raise HTTPException(status_code=422, detail="Nom de fichier invalide")
    return cleaned


def _file_info(path: str, name: str) -> dict:
    stat = os.stat(path)
    mime, _ = mimetypes.guess_type(name)
    return {
        "name": name,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "mime": mime or "application/octet-stream",
    }


@router.get("/")
def list_files():
    files = []
    for name in os.listdir(SHARED_STORAGE_PATH):
        path = os.path.join(SHARED_STORAGE_PATH, name)
        if os.path.isfile(path):
            files.append(_file_info(path, name))
    return sorted(files, key=lambda x: x["modified"], reverse=True)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = _safe_filename(file.filename or "upload")
    dest = os.path.join(SHARED_STORAGE_PATH, filename)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"status": "uploaded", **_file_info(dest, filename)}


@router.delete("/{filename}")
def delete_file(filename: str):
    filename = _safe_filename(filename)
    path = os.path.join(SHARED_STORAGE_PATH, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    os.remove(path)
    return {"status": "deleted", "name": filename}


@router.get("/download/{filename}")
def download_file(filename: str):
    filename = _safe_filename(filename)
    path = os.path.join(SHARED_STORAGE_PATH, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    mime, _ = mimetypes.guess_type(filename)
    return FileResponse(
        path,
        filename=filename,
        media_type=mime or "application/octet-stream",
    )

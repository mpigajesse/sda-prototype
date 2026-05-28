import os
import platform
import mimetypes
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse, Response
from cryptography.fernet import Fernet, InvalidToken

from ..database import SHARED_STORAGE_PATH

router = APIRouter()

# ---------------------------------------------------------------------------
# Identité du nœud et clé de coffre-fort
# ---------------------------------------------------------------------------
NODE_NAME = os.getenv("NODE_NAME", platform.node() or "node-local")

_NODE_VAULT_KEY_ENV = os.getenv("NODE_VAULT_KEY", "").strip()
_VAULT_KEY_FILE = os.path.join(os.path.dirname(SHARED_STORAGE_PATH), "db", ".node_vault_key")


def _get_vault_key() -> str:
    """Retourne la clé Fernet du nœud. Génère et persiste une clé si absente."""
    if _NODE_VAULT_KEY_ENV:
        return _NODE_VAULT_KEY_ENV
    os.makedirs(os.path.dirname(_VAULT_KEY_FILE), exist_ok=True)
    if os.path.isfile(_VAULT_KEY_FILE):
        return open(_VAULT_KEY_FILE).read().strip()
    key = Fernet.generate_key().decode()
    with open(_VAULT_KEY_FILE, "w") as f:
        f.write(key)
    return key


def _fernet(key_str: str) -> Fernet:
    return Fernet(key_str.encode() if isinstance(key_str, str) else key_str)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_SAFE_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._- ()")
_OWNER_EXT = ".sda-owner"


def _safe_filename(name: str) -> str:
    cleaned = "".join(c for c in name if c in _SAFE_CHARS).strip(". ")
    if not cleaned:
        raise HTTPException(status_code=422, detail="Nom de fichier invalide")
    return cleaned


def _owner_path(filename: str) -> str:
    return os.path.join(SHARED_STORAGE_PATH, filename + _OWNER_EXT)


def _read_owner(filename: str) -> str | None:
    p = _owner_path(filename)
    if not os.path.isfile(p):
        return None
    content = open(p).read().strip()
    return content or None


def _file_info(path: str, name: str) -> dict:
    stat = os.stat(path)
    mime, _ = mimetypes.guess_type(name)
    owner = _read_owner(name)
    vault_key = _get_vault_key()
    return {
        "name": name,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "mime": mime or "application/octet-stream",
        "owner_node": owner or "inconnu",
        "is_mine": owner == NODE_NAME,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/my-key")
def get_my_vault_key():
    """Retourne la clé publique de ce nœud (à partager manuellement avec un pair)."""
    return {
        "node_name": NODE_NAME,
        "vault_key": _get_vault_key(),
        "instructions": (
            "Partagez cette clé avec le nœud qui souhaite accéder à vos fichiers. "
            "Il doit la coller dans l'interface 'Déverrouiller' du coffre-fort."
        ),
    }


@router.get("/")
def list_files():
    files = []
    for name in os.listdir(SHARED_STORAGE_PATH):
        # Ignorer les fichiers de métadonnées internes et les fichiers système
        if name.endswith(_OWNER_EXT) or name.startswith("_") or name.startswith("."):
            continue
        path = os.path.join(SHARED_STORAGE_PATH, name)
        if not os.path.isfile(path):
            continue
        # N'afficher que les fichiers gérés par le coffre-fort (ayant un .sda-owner)
        if not os.path.isfile(_owner_path(name)):
            continue
        files.append(_file_info(path, name))
    return sorted(files, key=lambda x: x["modified"], reverse=True)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = _safe_filename(file.filename or "upload")
    dest = os.path.join(SHARED_STORAGE_PATH, filename)

    content = await file.read()

    # Chiffrement avec la clé du nœud courant
    vault_key = _get_vault_key()
    encrypted = _fernet(vault_key).encrypt(content)

    with open(dest, "wb") as f:
        f.write(encrypted)

    # Fichier de propriété — répliqué par Syncthing vers tous les pairs
    with open(_owner_path(filename), "w") as f:
        f.write(NODE_NAME)

    stat = os.stat(dest)
    return {
        "status": "uploaded",
        "name": filename,
        "owner_node": NODE_NAME,
        "is_mine": True,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "mime": mimetypes.guess_type(filename)[0] or "application/octet-stream",
    }


@router.delete("/{filename}")
def delete_file(filename: str):
    filename = _safe_filename(filename)
    path = os.path.join(SHARED_STORAGE_PATH, filename)

    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    owner = _read_owner(filename)
    if owner and owner != NODE_NAME:
        raise HTTPException(
            status_code=403,
            detail=f"Ce fichier appartient au nœud « {owner} ». Seul son propriétaire peut le supprimer."
        )

    os.remove(path)
    op = _owner_path(filename)
    if os.path.isfile(op):
        os.remove(op)

    return {"status": "deleted", "name": filename}


@router.get("/download/{filename}")
def download_file(filename: str, key: str = Query(default="")):
    filename = _safe_filename(filename)
    path = os.path.join(SHARED_STORAGE_PATH, filename)

    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    owner = _read_owner(filename)
    is_mine = owner == NODE_NAME

    # Choisir la clé de déchiffrement
    if is_mine:
        decrypt_key = _get_vault_key()
    elif key:
        decrypt_key = key.strip()
    else:
        owner_label = owner or "inconnu"
        raise HTTPException(
            status_code=403,
            detail=(
                f"Ce fichier appartient au nœud « {owner_label} ». "
                "Fournissez la clé de déchiffrement via le paramètre ?key= "
                "ou demandez-la au propriétaire via l'interface."
            )
        )

    try:
        encrypted = open(path, "rb").read()
        plaintext = _fernet(decrypt_key).decrypt(encrypted)
    except (InvalidToken, Exception):
        raise HTTPException(
            status_code=403,
            detail="Clé de déchiffrement incorrecte ou fichier corrompu."
        )

    mime, _ = mimetypes.guess_type(filename)
    return Response(
        content=plaintext,
        media_type=mime or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

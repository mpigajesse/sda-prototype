"""Coffre-fort de fichiers : dépôt chiffré, liste, téléchargement, suppression."""

import os

from cryptography.fernet import Fernet

from backend.app.database import SHARED_STORAGE_PATH
from backend.app.routers.files import NODE_NAME, _owner_path


def test_cle_du_noeud(client):
    rep = client.get("/api/v1/files/my-key").json()
    assert rep["node_name"] == NODE_NAME
    Fernet(rep["vault_key"].encode())  # clé Fernet valide


def test_depot_liste_telechargement_suppression(client):
    rep = client.post("/api/v1/files/upload", files={"file": ("note test.txt", b"secret", "text/plain")})
    assert rep.status_code == 200 and rep.json()["is_mine"] is True

    # Stocké chiffré sur disque, jamais en clair
    with open(os.path.join(SHARED_STORAGE_PATH, "note test.txt"), "rb") as f:
        assert b"secret" not in f.read()

    noms = [f["name"] for f in client.get("/api/v1/files/").json()]
    assert "note test.txt" in noms

    assert client.get("/api/v1/files/download/note test.txt").content == b"secret"
    assert client.delete("/api/v1/files/note test.txt").json()["status"] == "deleted"
    assert client.get("/api/v1/files/download/note test.txt").status_code == 404


def test_fichier_d_un_pair_exige_sa_cle(client):
    cle_pair = Fernet.generate_key()
    with open(os.path.join(SHARED_STORAGE_PATH, "pair.txt"), "wb") as f:
        f.write(Fernet(cle_pair).encrypt(b"du pair"))
    with open(_owner_path("pair.txt"), "w") as f:
        f.write("autre-noeud")

    assert client.get("/api/v1/files/download/pair.txt").status_code == 403
    assert client.get("/api/v1/files/download/pair.txt?key=mauvaise").status_code == 403
    assert client.get(f"/api/v1/files/download/pair.txt?key={cle_pair.decode()}").content == b"du pair"
    # Seul le propriétaire peut supprimer
    assert client.delete("/api/v1/files/pair.txt").status_code == 403


def test_nom_de_fichier_invalide(client):
    assert client.get("/api/v1/files/download/%2E%2E").status_code == 422

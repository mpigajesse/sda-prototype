"""Démo publique : garde de connexion, Syncthing simulé, données fictives, plafonds."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app import demo
from backend.app.main import health_check
from backend.app.routers import data, files, sync


@pytest.fixture
def app_demo(monkeypatch, tmp_path):
    monkeypatch.setattr(demo, "DEMO_PASSWORD", "mdp-test")
    monkeypatch.setattr(demo, "DEMO_MODE", True)
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>SPA</html>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    monkeypatch.setattr(demo, "FRONTEND_DIST", dist)

    app = FastAPI()
    app.get("/health")(health_check)
    app.include_router(data.router, prefix="/api/v1/data")
    app.include_router(sync.router, prefix="/api/v1/sync")
    app.include_router(files.router, prefix="/api/v1/files")
    demo.installer(app)
    return app


def _connecte(app):
    c = TestClient(app)
    rep = c.post("/connexion", data={"identifiant": "demo", "mot_de_passe": "mdp-test"}, follow_redirects=False)
    assert rep.status_code == 303 and rep.headers["location"] == "/"
    return c


def test_sans_mot_de_passe_rien_n_est_branche():
    app = FastAPI()
    demo.installer(app)  # DEMO_MODE est faux hors démo
    assert not [r for r in app.routes if getattr(r, "path", "") == "/connexion"]


def test_garde_et_page_de_connexion(app_demo):
    c = TestClient(app_demo)
    assert c.get("/health").status_code == 200
    assert c.get("/overview", follow_redirects=False).headers["location"] == "/connexion"
    assert c.get("/api/v1/files/").status_code == 401
    page = c.get("/connexion").text
    assert "mdp-test" in page and "demo" in page
    mauvais = c.post("/connexion", data={"identifiant": "demo", "mot_de_passe": "x"}, follow_redirects=False)
    assert mauvais.headers["location"] == "/connexion?erreur=1"
    assert "incorrects" in c.get("/connexion?erreur=1").text


def test_syncthing_simule(app_demo):
    c = _connecte(app_demo)
    statut = c.get("/syncthing-api/rest/system/status").json()
    cfg = c.get("/syncthing-api/rest/config").json()
    assert statut["myID"] == demo.LOCAL_ID and len(cfg["devices"]) == 3
    conn = c.get("/syncthing-api/rest/system/connections").json()["connections"]
    assert all(v["connected"] for v in conn.values())
    assert c.get("/syncthing-api/rest/system/version").json()["version"]
    assert c.get("/syncthing-api/rest/db/status?folder=sda-shared").json()["state"] == "idle"
    evts = c.get("/syncthing-api/rest/events?since=0&limit=5").json()
    assert 0 < len(evts) <= 5 and evts[-1]["id"] > evts[0]["id"]
    assert c.get("/sda-api/health").json()["status"] == "operational"
    assert "Syncthing ne tourne pas" in c.get("/syncthing-gui").text


def test_donnees_fictives_et_coffre(app_demo):
    c = _connecte(app_demo)
    noms = {f["name"]: f for f in c.get("/api/v1/files/").json()}
    assert noms["LISEZ-MOI-demo.txt"]["is_mine"] is True
    assert noms["contrat-fournisseur.txt"]["owner_node"] == "ubuntu"
    lisez_moi = c.get("/api/v1/files/download/LISEZ-MOI-demo.txt").text
    cle_ubuntu = lisez_moi.split("Clé du nœud ubuntu : ")[1].split()[0]
    assert "Contrat fictif" in c.get(f"/api/v1/files/download/contrat-fournisseur.txt?key={cle_ubuntu}").text
    demo._amorcer()  # idempotent : ne duplique rien
    assert len(c.get("/api/v1/files/").json()) == len(noms)


def test_plafonds_de_depot(app_demo, monkeypatch):
    c = _connecte(app_demo)
    monkeypatch.setattr(demo, "TAILLE_MAX_FICHIER", 10)
    trop_gros = c.post("/api/v1/files/upload", files={"file": ("gros.txt", b"x" * 100, "text/plain")})
    assert trop_gros.status_code == 413
    monkeypatch.setattr(demo, "TAILLE_MAX_FICHIER", 10_000)
    monkeypatch.setattr(demo, "NOMBRE_MAX_FICHIERS", 0)
    assert c.post("/api/v1/files/upload", files={"file": ("a.txt", b"a", "text/plain")}).status_code == 403


def test_frontend_servi_par_la_meme_origine(app_demo):
    c = _connecte(app_demo)
    assert c.get("/").text == "<html>SPA</html>"
    assert c.get("/files").text == "<html>SPA</html>"  # route du routeur React
    assert c.get("/assets/app.js").text == "console.log(1)"
    assert c.get("/connexion", follow_redirects=False).status_code == 303  # déjà connecté

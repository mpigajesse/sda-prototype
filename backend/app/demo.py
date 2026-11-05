"""Démo publique (portfolio) du nœud SDA — activée seulement si DEMO_PASSWORD est défini.

Pourquoi ce module existe : un nœud réel tourne sur les machines de son
propriétaire, à côté d'un Syncthing local et de pairs sur le même réseau. Sur un
hébergement gratuit (Render), il n'y a ni Syncthing ni pairs. La démo :

- simule l'API REST de Syncthing (`/syncthing-api/rest/*`) avec un cluster
  FICTIF de trois nœuds (win11 / ubuntu / kali, comme le banc du projet), pour
  que le tableau de bord, la page Cluster et le flux d'évènements s'affichent ;
- remplit le moteur de données (DuckDB + journal d'audit chaîné) et le
  coffre-fort avec des enregistrements et documents FICTIFS ;
- protège toute l'interface derrière une page de connexion dont les
  identifiants sont affichés (le compte n'a aucun droit d'administration :
  il n'en existe pas dans le prototype) ;
- plafonne les dépôts de fichiers, pour que la démo ne serve pas d'hébergeur
  public de fichiers.

Le disque gratuit est effacé à chaque mise en veille : la démo revient alors à
son état initial. Sans DEMO_PASSWORD, rien de ce module n'est branché et le
nœud se comporte exactement comme en production.
"""

from __future__ import annotations

import hashlib
import hmac
import html
import os
import random
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.fernet import Fernet
from fastapi import APIRouter, FastAPI, Form, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "")
DEMO_MODE = bool(DEMO_PASSWORD)
DEMO_USERNAME = "demo"
_SECRET = (os.getenv("SECRET_KEY") or DEMO_PASSWORD or "dev").encode()
_COOKIE = "sda_demo"
_DEMARRAGE = time.time()

# Plafonds du coffre-fort en démo
TAILLE_MAX_FICHIER = 2 * 1024 * 1024
NOMBRE_MAX_FICHIERS = 30

FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))

# ── Cluster fictif ────────────────────────────────────────────────────────────
# Identifiants au format Syncthing (8 groupes de 7 caractères), inventés.
LOCAL_ID = "WIN11AA-7QKXP2D-M4R8T6Z-B3N5V9C-H2J6K8L-Q4W7E1R-T5Y9U3I-DEMO001"
PAIRS = [
    {"deviceID": "UBUNTU2-K8M3N6B-V1C4X7Z-L9P2Q5W-E8R1T4Y-U7I0O3P-A6S9D2F-DEMO002",
     "name": "ubuntu", "address": "tcp://192.168.200.130:22000", "client": "v1.27.12"},
    {"deviceID": "KALINUX-F5G8H1J-K4L7Z0X-C3V6B9N-M2Q5W8E-R1T4Y7U-I0O3P6A-DEMO003",
     "name": "kali", "address": "tcp://192.168.200.128:22000", "client": "v1.27.12"},
]
DOSSIER = {"id": "sda-shared", "label": "SDA_Shared", "path": "/var/syncthing/SDA_Shared", "type": "sendreceive"}


def _uptime() -> int:
    return int(time.time() - _DEMARRAGE)


syncthing = APIRouter()


@syncthing.get("/system/status")
def system_status():
    return {
        "myID": LOCAL_ID,
        "cpuPercent": round(2.5 + random.random() * 4, 2),
        "alloc": 38_000_000 + random.randint(0, 6_000_000),
        "sys": 72_000_000,
        "uptime": _uptime() + 3 * 3600,
        "version": "v1.27.12",
        "goroutines": 84 + random.randint(0, 12),
    }


@syncthing.get("/system/version")
def system_version():
    return {"version": "v1.27.12", "longVersion": "syncthing v1.27.12 (démo simulée)", "os": "windows", "arch": "amd64"}


@syncthing.get("/config")
def config():
    devices = [{"deviceID": LOCAL_ID, "name": "win11", "addresses": ["dynamic"], "paused": False}]
    devices += [{"deviceID": p["deviceID"], "name": p["name"], "addresses": [p["address"]], "paused": False} for p in PAIRS]
    return {"folders": [DOSSIER], "devices": devices}


@syncthing.get("/system/connections")
def connections():
    base = _uptime()
    return {"connections": {
        p["deviceID"]: {
            "connected": True,
            "inBytesTotal": 18_400_000 + base * (900 + 300 * i),
            "outBytesTotal": 12_100_000 + base * (650 + 250 * i),
            "address": p["address"].removeprefix("tcp://"),
            "type": "tcp-client",
            "clientVersion": p["client"],
        } for i, p in enumerate(PAIRS)
    }}


@syncthing.get("/db/status")
def db_status(folder: str = ""):
    nb = len([n for n in os.listdir(_stockage()) if not n.startswith(".")]) if os.path.isdir(_stockage()) else 0
    return {"state": "idle", "stateChanged": datetime.now(timezone.utc).isoformat(),
            "localFiles": nb, "localBytes": 1_850_000 + nb * 4096, "inSyncFiles": nb,
            "needFiles": 0, "errors": 0}


_TYPES = [
    ("ItemFinished", True), ("StateChanged", True), ("RemoteChangeDetected", True),
    ("LocalChangeDetected", True), ("FolderSyncProgress", True), ("DeviceConnected", False),
]
_FICHIERS_EVT = ["tenant-atlas_storage.parquet", "rapport-trimestriel.csv", "inventaire-depot.csv",
                 "contrat-fournisseur.txt", "tenant-oasis_storage.parquet"]


@syncthing.get("/events")
def events(since: int = 0, limit: int = 20):
    # Un évènement fictif toutes les 4 s environ, numérotés depuis le démarrage.
    dernier = _uptime() // 4 + 12
    debut = max(since + 1, dernier - limit + 1)
    sortie = []
    for n in range(debut, dernier + 1):
        rng = random.Random(n)
        typ, avec_fichier = rng.choice(_TYPES)
        data: dict = {"folder": DOSSIER["label"]} if avec_fichier else {"device": rng.choice(PAIRS)["deviceID"]}
        if avec_fichier:
            data["item"] = rng.choice(_FICHIERS_EVT)
        quand = datetime.now(timezone.utc) - timedelta(seconds=(dernier - n) * 4)
        sortie.append({"id": n, "time": quand.isoformat(), "type": typ, "data": data})
    return sortie


# ── Connexion de démonstration ────────────────────────────────────────────────

def _jeton() -> str:
    return hmac.new(_SECRET, f"{DEMO_USERNAME}:{DEMO_PASSWORD}".encode(), hashlib.sha256).hexdigest()


def _connecte(request: Request) -> bool:
    return hmac.compare_digest(request.cookies.get(_COOKIE, ""), _jeton())


_PUBLIC = ("/connexion", "/health", "/favicon")


def _page_connexion(erreur: bool) -> str:
    alerte = '<p class="err">Identifiants incorrects.</p>' if erreur else ""
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Connexion — SDA</title>
<style>
body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1118;color:#e2e8f0;
font-family:Inter,system-ui,sans-serif;padding:16px}}
.c{{width:100%;max-width:380px;background:#111820;border:1px solid #1e2a38;border-radius:16px;padding:32px}}
h1{{font-size:1.15rem;margin:0 0 4px}} p.s{{color:#94a3b8;font-size:.85rem;margin:0 0 20px}}
label{{display:block;font-size:.8rem;color:#94a3b8;margin:12px 0 6px}}
input{{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #1e2a38;
background:#0b1118;color:#e2e8f0;font-size:.95rem}}
button{{width:100%;margin-top:18px;padding:11px;border:0;border-radius:10px;background:#B3121B;color:#fff;
font-weight:600;font-size:.95rem;cursor:pointer}}
.demo{{margin-top:18px;padding:12px 14px;border:1px solid #C79A1B55;border-radius:10px;font-size:.85rem;line-height:1.6}}
code{{color:#C79A1B}} .err{{color:#f87171;font-size:.85rem}}
</style></head><body><form class="c" method="post" action="/connexion">
<h1>Coffre-Fort Data P2P Souverain</h1><p class="s">Nœud SDA · tableau de bord</p>{alerte}
<label for="u">Identifiant</label><input id="u" name="identifiant" autocomplete="username" required>
<label for="p">Mot de passe</label><input id="p" name="mot_de_passe" type="password" autocomplete="current-password" required>
<button type="submit">Se connecter</button>
<div class="demo"><strong>Démonstration — données fictives</strong><br>
Identifiant : <code>{DEMO_USERNAME}</code><br>Mot de passe : <code>{html.escape(DEMO_PASSWORD)}</code><br>
<span style="color:#94a3b8">Le cluster de 3 nœuds est simulé : Syncthing ne tourne pas sur l'hébergement de démo.</span></div>
</form></body></html>"""


# ── Données fictives ──────────────────────────────────────────────────────────

def _stockage() -> str:
    from .database import SHARED_STORAGE_PATH
    return SHARED_STORAGE_PATH


def _amorcer() -> None:
    """Remplit le moteur de données et le coffre-fort (idempotent)."""
    from .database import SessionLocal, get_duckdb_connection
    from .models import AuditTrail
    from .routers import data as data_router
    from .routers.files import NODE_NAME, _get_vault_key, _owner_path

    db = SessionLocal()
    try:
        if db.query(AuditTrail).count() == 0:
            rng = random.Random(42)
            gen = get_duckdb_connection()
            duck = next(gen)
            try:
                for tenant, capteurs in [("atlas-distribution", ["entrepot-casa", "entrepot-rabat"]),
                                         ("oasis-sante", ["clinique-nord", "pharmacie-centre"])]:
                    for i in range(12):
                        payload = data_router.IngestPayload(tenant_id=tenant, data={
                            "site": capteurs[i % 2], "temperature_c": round(18 + rng.random() * 9, 1),
                            "humidite_pct": rng.randint(35, 70), "evenements": rng.randint(0, 40),
                            "note": "donnée fictive de démonstration"})
                        data_router.ingest_data(payload, db=db, duck=duck)
            finally:
                gen.close()
    finally:
        db.close()

    stockage = _stockage()
    if any(n.endswith(".sda-owner") for n in os.listdir(stockage)):
        return
    cles_pairs = {p["name"]: Fernet.generate_key().decode() for p in PAIRS}
    documents = [
        ("rapport-trimestriel.csv", NODE_NAME,
         "trimestre;chiffre_affaires_mad;commandes\nT1;1250000;412\nT2;1385000;447\nT3;1302000;431\n"),
        ("inventaire-depot.csv", NODE_NAME,
         "code;article;quantite\nATL-001;Huile 5 L;35\nATL-002;Farine 25 kg;12\nATL-003;Sucre 1 kg;160\n"),
        ("contrat-fournisseur.txt", "ubuntu",
         "Contrat fictif — démonstration. Ce document appartient au nœud ubuntu : il est chiffré avec SA clé.\n"),
        ("plan-continuite.txt", "kali",
         "Plan de continuité fictif — démonstration. Document du nœud kali, chiffré avec sa clé.\n"),
        ("LISEZ-MOI-demo.txt", NODE_NAME,
         "Démo du coffre-fort SDA (données fictives).\n\n"
         "Les fichiers de ce nœud (win11) se téléchargent directement. Ceux des pairs sont chiffrés avec\n"
         "leur propre clé : pour les ouvrir, collez la clé du pair dans « Déverrouiller ».\n\n"
         + "".join(f"Clé du nœud {nom} : {cle}\n" for nom, cle in cles_pairs.items())),
    ]
    for nom, proprietaire, contenu in documents:
        cle = _get_vault_key() if proprietaire == NODE_NAME else cles_pairs[proprietaire]
        with open(os.path.join(stockage, nom), "wb") as f:
            f.write(Fernet(cle.encode()).encrypt(contenu.encode()))
        with open(_owner_path(nom), "w") as f:
            f.write(proprietaire)


# ── Branchement ───────────────────────────────────────────────────────────────

def installer(app: FastAPI) -> None:
    """Branche la démo sur l'application (no-op sans DEMO_PASSWORD)."""
    if not DEMO_MODE:
        return

    app.include_router(syncthing, prefix="/syncthing-api/rest", include_in_schema=False)

    @app.get("/sda-api/health", include_in_schema=False)
    def sante_alias():
        from .main import health_check
        return health_check()

    @app.middleware("http")
    async def garde(request: Request, call_next):
        chemin = request.url.path
        if not chemin.startswith(_PUBLIC) and not _connecte(request):
            if chemin.startswith(("/api/", "/syncthing-api/", "/sda-api/")):
                return JSONResponse({"detail": "Connexion requise"}, status_code=401)
            return RedirectResponse("/connexion", status_code=303)
        if chemin == "/api/v1/files/upload" and request.method == "POST":
            taille = int(request.headers.get("content-length") or 0)
            fichiers = [n for n in os.listdir(_stockage()) if n.endswith(".sda-owner")]
            if taille > TAILLE_MAX_FICHIER:
                return JSONResponse({"detail": "Démo : 2 Mo maximum par fichier."}, status_code=413)
            if len(fichiers) >= NOMBRE_MAX_FICHIERS:
                return JSONResponse({"detail": "Démo : coffre-fort plein (30 fichiers). Il se vide à chaque mise en veille."}, status_code=403)
        return await call_next(request)

    @app.get("/connexion", include_in_schema=False)
    def connexion_page(request: Request, erreur: int = 0):
        if _connecte(request):
            return RedirectResponse("/", status_code=303)
        return HTMLResponse(_page_connexion(bool(erreur)))

    @app.post("/connexion", include_in_schema=False)
    def connexion(request: Request, identifiant: str = Form(...), mot_de_passe: str = Form(...)):
        ok = hmac.compare_digest(identifiant.strip(), DEMO_USERNAME) and hmac.compare_digest(mot_de_passe, DEMO_PASSWORD)
        if not ok:
            return RedirectResponse("/connexion?erreur=1", status_code=303)
        rep = RedirectResponse("/", status_code=303)
        # Render termine le TLS : le schéma réel arrive dans X-Forwarded-Proto.
        https = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
        rep.set_cookie(_COOKIE, _jeton(), httponly=True, samesite="lax", secure=https, max_age=8 * 3600)
        return rep

    @app.get("/syncthing-gui", include_in_schema=False)
    def syncthing_gui():
        # Le frontend de démo (VITE_SYNCTHING_GUI_URL=/syncthing-gui) pointe ici au lieu
        # de http://localhost:8384, qui ouvrirait la machine du visiteur.
        return HTMLResponse("""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Interface Syncthing — démo</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1118;color:#e2e8f0;
font-family:Inter,system-ui,sans-serif;padding:16px}.c{max-width:520px;background:#111820;border:1px solid #1e2a38;
border-radius:16px;padding:28px;line-height:1.6}a{color:#C79A1B}</style></head><body><div class="c">
<h1 style="font-size:1.1rem;margin-top:0">Interface Syncthing</h1>
<p>Sur un vrai nœud SDA, ce lien ouvre l'interface web de Syncthing (port 8384) sur la machine du
propriétaire : elle n'est jamais exposée sur Internet.</p>
<p>Dans cette démo hébergée, Syncthing ne tourne pas : le cluster de trois nœuds affiché par le
tableau de bord est simulé.</p><p><a href="/overview">← Retour au tableau de bord</a></p>
</div></body></html>""")

    _amorcer()

    # Frontend construit, servi par la même origine (évite CORS et règles de réécriture).
    if FRONTEND_DIST.is_dir():
        index = FRONTEND_DIST / "index.html"

        @app.get("/{chemin:path}", include_in_schema=False)
        def spa(chemin: str):
            fichier = (FRONTEND_DIST / chemin).resolve()
            if chemin and fichier.is_file() and FRONTEND_DIST.resolve() in fichier.parents:
                return FileResponse(fichier)
            return FileResponse(index)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import data, sync

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sovereign Data Agent (SDA) Core Runtime",
    description=(
        "Moteur backend décentralisé pour l'isolation des données par Tenant. "
        "Architecture local-first / P2P — aucune dépendance vers un serveur central."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Restriction CORS stricte au périmètre local du nœud (Code-to-Data paradigm).
# En production multi-nœuds, ajouter les IP/hostnames des nœuds pairs.
_CORS_ORIGINS = [
    "http://localhost",
    "http://localhost:3000",
    "https://localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Client-DN"],
)

app.include_router(data.router, prefix="/api/v1/data", tags=["Moteur de Données"])
app.include_router(sync.router, prefix="/api/v1/sync", tags=["Réseau P2P"])


@app.get("/health", tags=["Système"])
def health_check():
    return {
        "status": "operational",
        "architecture": "local-first / distributed",
        "central_dependency": "none",
        "offline_ready": True,
    }

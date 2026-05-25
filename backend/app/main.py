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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

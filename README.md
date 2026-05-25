# Sovereign Data Agent (SDA) — Prototype

> **Projet de Fin d'Études — EIGSI × AL BARAA CONSULTING**
> MPIGA-ODOUMBA Jesse · Promotion 2026

Coffre-fort de données décentralisé, P2P et offline-first. Aucune dépendance vers un serveur central : chaque nœud est souverain.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Nœud SDA (Docker Compose)                              │
│                                                         │
│  ┌──────────┐   TLS 1.3 + mTLS   ┌──────────────────┐  │
│  │  Client  │ ─────────────────► │  Nginx (443)     │  │
│  └──────────┘                    └────────┬─────────┘  │
│                                           │             │
│              ┌────────────────────────────┼──────────┐  │
│              │                            ▼          │  │
│              │  ┌─────────────┐  ┌──────────────┐   │  │
│              │  │  Frontend   │  │  FastAPI     │   │  │
│              │  │  React+Vite │  │  :8000       │   │  │
│              │  └─────────────┘  └──────┬───────┘   │  │
│              │                          │            │  │
│              │            ┌─────────────┴──────────┐ │  │
│              │            │ SQLite (SQLCipher)      │ │  │
│              │            │ DuckDB (OLAP)           │ │  │
│              │            │ Parquet (Fernet AES)    │ │  │
│              │            └────────────────────────┘ │  │
│              └──────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Syncthing — réplication P2P (BEP / TLS 1.3)   │    │
│  │  shared_storage/*.parquet ←──────────────────► │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Couches

| Couche | Technologie | Rôle |
|--------|-------------|------|
| API | FastAPI + Uvicorn | REST, Swagger, health check |
| Stockage | SQLite (SQLCipher) + DuckDB | Métadonnées/audit + requêtes analytiques Parquet |
| Réplication | Syncthing (BEP / TLS 1.3) | Sync P2P fichiers `.parquet` entre nœuds |
| Proxy | Nginx | TLS 1.3 only + authentification mutuelle x509 |

---

## Sécurité

| Mécanisme | Implémentation |
|-----------|----------------|
| **Chiffrement au repos — SQLite** | SQLCipher AES-256-CBC, 256 000 itérations KDF |
| **Chiffrement au repos — Parquet** | `cryptography.fernet` (AES-128-CBC + HMAC-SHA256) |
| **Transport** | TLS 1.3 uniquement (TLS 1.2 et inférieurs refusés) |
| **Authentification mutuelle** | Certificats x509 signés par CA interne — chaque nœud doit présenter son certificat |
| **Audit trail** | Hash SHA-256 chaîné (style blockchain léger) dans SQLite |
| **HSTS** | `max-age=31536000; includeSubDomains` |

---

## Prérequis

- Docker Desktop ≥ 24.0
- Docker Compose ≥ 2.20
- `openssl` (pour la génération des certificats)
- Python 3.11+ (développement local uniquement)

---

## Démarrage rapide

### 1. Cloner et configurer

```bash
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype
```

### 2. Générer les certificats TLS (une seule fois par nœud)

```bash
bash scripts/generate-certs.sh
```

Génère dans `config/nginx/certs/` :
- `ca.key` / `ca.crt` — Autorité de certification interne SDA
- `server.key` / `server.crt` — Certificat serveur Nginx
- `client.key` / `client.crt` — Certificat client exemple (nœud pair)

### 3. Configurer les clés de chiffrement

```bash
cp .env.example .env
```

Éditer `.env` :

```env
# Clé SQLCipher pour SQLite
# python -c "import secrets; print(secrets.token_hex(32))"
DB_ENCRYPTION_KEY=<votre-clé-hex-64-chars>

# Clé Fernet pour les Parquets
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
PARQUET_FERNET_KEY=<votre-clé-fernet>
```

### 4. Lancer la stack complète

```bash
docker compose --env-file .env up --build
```

| Service | URL |
|---------|-----|
| Frontend (via Nginx TLS) | https://localhost |
| API Swagger | https://localhost/docs |
| Syncthing Web GUI | http://localhost:8384 |

### 5. Tester via mTLS

```bash
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     https://localhost/health
```

Réponse attendue :
```json
{
  "status": "operational",
  "architecture": "local-first / distributed",
  "central_dependency": "none",
  "offline_ready": true
}
```

---

## API

### POST `/api/v1/data/ingest`

Ingère un enregistrement tenant. Écrit dans DuckDB, exporte un Parquet chiffré, enregistre dans l'audit trail SQLite.

```bash
curl -X POST https://localhost/api/v1/data/ingest \
     --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     -H "Content-Type: application/json" \
     -d '{"tenant_id": "tenant-A", "data": {"kpi": "revenue", "value": 42000}}'
```

### POST `/api/v1/sync/reconcile`

Résout les conflits Syncthing (`*.sync-conflict-*`) par déduplication LWW (Last-Write-Wins sur `ingested_at`).

```bash
curl -X POST https://localhost/api/v1/sync/reconcile \
     --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key
```

---

## Développement local (sans Docker)

```bash
python -m venv env
source env/bin/activate       # Linux/macOS
# .\env\Scripts\Activate.ps1  # Windows

pip install -r backend/requirements.txt -r requirements-dev.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Tests

```bash
# Tests unitaires + couverture
pytest --cov=backend/app --cov-report=term-missing

# Tests de charge (scénario 10 nœuds)
locust -f tests/locustfile.py

# Scan sécurité statique
bandit -r backend/app/
```

---

## Structure du projet

```
sda-prototype/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI entry point
│       ├── database.py      # SQLite (SQLCipher) + DuckDB + helpers Fernet
│       ├── models.py        # AuditTrail SHA-256 chaîné
│       └── routers/
│           ├── data.py      # POST /api/v1/data/ingest
│           └── sync.py      # POST /api/v1/sync/reconcile (CRDT LWW)
├── frontend/                # React + Vite (dashboard P2P)
├── config/
│   ├── nginx/
│   │   ├── nginx.conf       # TLS 1.3 + mTLS
│   │   └── certs/           # Généré par scripts/generate-certs.sh (gitignored)
│   └── syncthing/           # Config Syncthing (gitignored)
├── data/
│   ├── db/                  # SQLite + DuckDB (volume Docker, gitignored)
│   └── shared_storage/      # Parquets chiffrés synchronisés par Syncthing
├── scripts/
│   └── generate-certs.sh    # Génération CA + serveur + client x509
├── tests/                   # pytest + locust
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Critères de validation POC

| Critère | Cible |
|---------|-------|
| Réplication P2P | 3+ nœuds, 0 perte de données |
| Conflits CRDT | 0 conflit non résolu |
| Latence DuckDB | < 1s sur 1M lignes |
| Latence locale | < 100ms |
| Déploiement Docker | < 30 minutes |
| Couverture tests | > 80% |
| Vulnérabilités critiques | 0 (Bandit + Trivy) |
| Documentation API | 100% Swagger/OpenAPI |

---

## Contexte

Ce prototype est réalisé dans le cadre du PFE de Jesse MPIGA-ODOUMBA à l'EIGSI, en stage chez **AL BARAA CONSULTING** (2025–2026). Il illustre le paradigme **Code-to-Data** : la donnée ne quitte jamais le périmètre de confiance de l'organisation.

---

## Licence

Projet académique — tous droits réservés MPIGA-ODOUMBA Jesse / EIGSI 2026.

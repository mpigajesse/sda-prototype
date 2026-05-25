# Coffre-Fort Data P2P Souverain — SDA Prototype

> **PFE · Spécialité Big Data & IA · EIGSI × AL BARAA CONSULTING**
> MPIGA-ODOUMBA Jesse · Promotion 2026
> Tuteur entreprise : CHOKRI Soumia · Tuteur EIGSI : M. Ayoub Amrani

---

## Contexte et Problématique

Le secteur de la gestion des données en Afrique est aujourd'hui caractérisé par une **dépendance critique aux solutions cloud centralisées étrangères**. Les organisations africaines ne maîtrisent ni la localisation physique de leurs données, ni les conditions d'accès, ni la pérennité des services utilisés (AWS, Azure, GCP).

Cette dépendance contredit directement les orientations de l'**AU Data Policy Framework (AUDPF)**, validé par l'Union Africaine en décembre 2025, qui impose que les données africaines restent sous contrôle local.

> **Question centrale** : Comment garantir la souveraineté, la sécurité et la résilience des données dans un environnement africain, tout en réduisant la dépendance aux infrastructures cloud centralisées étrangères ?

---

## La Solution : Brique Universelle Décentralisée

Ce projet conçoit et implémente une **architecture Coffre-Fort Data P2P Souveraine**, pensée comme une *brique universelle* de Backend-as-a-Service (BaaS) décentralisée. Chaque terminal devient un nœud de stockage intelligent, autonome et résilient.

### Trois piliers fondateurs

| Pilier | Description |
|--------|-------------|
| **Autonomie Infrastructurelle** | Chaque terminal assure la persistance locale + réplication P2P automatique via Syncthing, découverte mDNS et résolution de conflits (CRDT) |
| **Ingénierie par Orchestration** | Assemblage de technologies open-source éprouvées (DuckDB, SQLite, Syncthing, Docker) — pas de développement from scratch |
| **Sécurité & Interopérabilité** | TLS 1.3, authentification mutuelle x509, AES-256 au repos, API REST standards |

### Positionnement vs alternatives

| Critère | IPFS/Filecoin | Solid (Pods) | **SDA Brique Universelle** |
|---------|--------------|-------------|---------------------------|
| Stockage | Blobs/fichiers bruts | Graphe RDF | **Relationnel & Analytique** |
| Capacité OLAP | Inexistante | Très limitée | **Native (DuckDB)** |
| Disponibilité offline | Dépend des nœuds | Requiert connexion | **Local-first (offline total)** |
| Réplication P2P | Native (BitSwap) | Non | **Optimisée (Syncthing)** |
| Résolution conflits | Immuabilité simple | Manuelle | **Automatique (CRDT LWW)** |
| Souveraineté | Dépendance pinning | Dépendance hébergeur | **Souveraineté infrastructurelle** |

---

## Architecture

```
╔══════════════════════════════════════════════════════════════╗
║  Nœud SDA — Docker Compose (chaque terminal = serveur)       ║
║                                                              ║
║  ┌────────────┐  TLS 1.3 + mTLS x509  ┌──────────────────┐  ║
║  │   Client   │ ─────────────────────►│  Nginx :443      │  ║
║  └────────────┘                       └────────┬─────────┘  ║
║                                                │            ║
║  ┌─────────────────────┐  ┌───────────────────┴──────────┐  ║
║  │   Frontend React    │  │   FastAPI (Uvicorn :8000)    │  ║
║  │   Dashboard P2P     │  │   /api/v1/data/ingest        │  ║
║  └─────────────────────┘  │   /api/v1/sync/reconcile     │  ║
║                           └──────────────┬───────────────┘  ║
║                                          │                  ║
║              ┌───────────────────────────┴────────────────┐ ║
║              │  Couche Stockage                            │ ║
║              │  ┌──────────────────┐  ┌────────────────┐  │ ║
║              │  │ SQLite (metadata)│  │ DuckDB (OLAP)  │  │ ║
║              │  │ SQLCipher AES-256│  │ Parquet Fernet │  │ ║
║              │  │ Audit SHA-256    │  │ shared_storage/│  │ ║
║              │  └──────────────────┘  └───────┬────────┘  │ ║
║              └───────────────────────────────┼────────────┘ ║
║                                              │              ║
║  ┌───────────────────────────────────────────▼────────────┐ ║
║  │  Syncthing — Réplication P2P (BEP / TLS 1.3)          │ ║
║  │  *.parquet chiffrés ←──── mDNS ────► *.parquet         │ ║
║  └────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════╝
         ↕ sync P2P                         ↕ sync P2P
╔════════════════════╗             ╔════════════════════╗
║   Nœud SDA #2      ║             ║   Nœud SDA #3      ║
╚════════════════════╝             ╚════════════════════╝
```

### Architecture modulaire en 5 couches

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Infrastructure** | Docker Compose | Isolation, portabilité, déploiement < 30 min |
| **Sécurité** | Nginx + TLS 1.3 + x509 | Proxy, chiffrement transport, mTLS |
| **API** | FastAPI + Uvicorn | REST, Swagger auto-généré, health check |
| **Stockage** | SQLite (SQLCipher) + DuckDB | Métadonnées/audit ACID + requêtes analytiques OLAP sur Parquet |
| **Réplication** | Syncthing (BEP) + mDNS | Sync P2P LAN/WAN, découverte automatique, résolution conflits |

---

## Fonctionnement — Paradigme Code-to-Data

> La donnée **ne quitte jamais** le périmètre de confiance de l'organisation.

Le principe fondamental est l'inversion du modèle SaaS classique :

```
Modèle SaaS classique :    Données → Cloud centralisé étranger → Traitement
Modèle SDA (Code-to-Data): Code (image Docker) → Nœud local → Données restent en place
```

**Flux d'ingestion :**
1. L'application métier appelle `POST /api/v1/data/ingest` avec `{tenant_id, data}`
2. FastAPI écrit dans DuckDB (OLAP) + exporte un fichier `.parquet` chiffré (Fernet)
3. L'audit trail enregistre un hash SHA-256 chaîné dans SQLite (SQLCipher)
4. Syncthing réplique automatiquement le Parquet vers tous les nœuds du même réseau de confiance

**Résolution de conflits (CRDT LWW) :**
- Syncthing détecte les fichiers `*.sync-conflict-*` lors d'écritures concurrentes
- `POST /api/v1/sync/reconcile` fusionne par déduplication sur `(tenant_id, ingested_at)`
- Stratégie Last-Write-Wins via DuckDB SQL — adaptée aux métriques sans édition collaborative simultanée

---

## Sécurité

| Surface | Mécanisme | Standard |
|---------|-----------|----------|
| **Données au repos — SQLite** | SQLCipher AES-256-CBC, KDF 256 000 itérations | AUDPF / RGPD |
| **Données au repos — Parquet** | `cryptography.fernet` (AES-128-CBC + HMAC-SHA256) | AUDPF |
| **Transport** | TLS 1.3 exclusif — TLS 1.2 et inférieurs refusés par Nginx | NIS2 / DORA |
| **Authentification** | Certificats x509 mutuels signés par CA interne — `ssl_verify_client on` | Zero-trust |
| **Audit trail** | Hash SHA-256 chaîné (blockchain léger) sur chaque ingestion | Traçabilité |
| **Headers HTTP** | HSTS `max-age=31536000; includeSubDomains` | OWASP |

---

## Prérequis

- Docker Desktop ≥ 24.0 + Docker Compose ≥ 2.20
- `openssl` (génération des certificats)
- Python 3.11+ (développement local uniquement)

---

## Démarrage rapide

### 1. Cloner le dépôt

```bash
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype
```

### 2. Générer les certificats x509 (une seule fois par nœud)

```bash
bash scripts/generate-certs.sh
```

Génère dans `config/nginx/certs/` :
- `ca.crt` — Autorité de certification interne SDA (périmètre de confiance)
- `server.crt/key` — Certificat serveur Nginx
- `client.crt/key` — Certificat client exemple (nœud pair)

### 3. Configurer les clés de chiffrement

```bash
cp .env.example .env
```

```env
# Clé SQLCipher pour SQLite (AES-256)
# Générer : python -c "import secrets; print(secrets.token_hex(32))"
DB_ENCRYPTION_KEY=<clé-hex-64-chars>

# Clé Fernet pour les exports Parquet
# Générer : python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
PARQUET_FERNET_KEY=<clé-fernet>
```

### 4. Lancer la stack

```bash
docker compose --env-file .env up --build
```

| Service | Accès | Description |
|---------|-------|-------------|
| **Frontend** | https://localhost | Dashboard monitoring P2P temps réel |
| **API Swagger** | https://localhost/docs | Documentation interactive complète |
| **Syncthing GUI** | http://localhost:8384 | Admin P2P local (LAN only) |

> Les connexions HTTP :80 sont automatiquement redirigées vers HTTPS :443.

### 5. Tester l'API via mTLS

```bash
# Health check
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     https://localhost/health

# Ingérer une donnée (tenant isolé)
curl -X POST https://localhost/api/v1/data/ingest \
     --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     -H "Content-Type: application/json" \
     -d '{"tenant_id": "org-casablanca", "data": {"kpi": "chiffre_affaires", "valeur": 4200000}}'

# Réconcilier les conflits de réplication
curl -X POST https://localhost/api/v1/sync/reconcile \
     --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key
```

---

## API Reference

### `POST /api/v1/data/ingest`

Ingère un enregistrement tenant. Persiste dans DuckDB, exporte un Parquet chiffré, enregistre dans l'audit trail SQLite avec hash SHA-256 chaîné.

**Corps :**
```json
{ "tenant_id": "string", "data": { "clé": "valeur" } }
```

**Réponse :**
```json
{
  "status": "success",
  "tenant_id": "org-casablanca",
  "record_hash": "a3f8d2...",
  "audit_id": 42,
  "parquet_path": "/app/data/shared_storage/org-casablanca_storage.parquet"
}
```

### `POST /api/v1/sync/reconcile`

Résout les fichiers `*.sync-conflict-*` générés par Syncthing lors de conflits d'écriture concurrents. Applique la stratégie LWW (Last-Write-Wins) via DuckDB SQL.

**Réponse :**
```json
{
  "status": "reconciled",
  "conflicts_resolved": 2,
  "merged_records": 17,
  "timestamp": "2026-05-25T10:30:00Z"
}
```

---

## Développement local

```bash
python -m venv env
source env/bin/activate       # Linux/macOS
.\env\Scripts\Activate.ps1    # Windows PowerShell

pip install -r backend/requirements.txt -r requirements-dev.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Tests et qualité

```bash
# Tests unitaires + couverture (cible : > 80%)
pytest --cov=backend/app --cov-report=term-missing

# Tests de charge — scénario 10 nœuds simultanés
locust -f tests/locustfile.py --host=http://localhost:8000

# Scan sécurité statique (Bandit)
bandit -r backend/app/

# Scan vulnérabilités image Docker (Trivy)
trivy image sda-backend:latest
```

---

## Structure du projet

```
sda-prototype/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI : CORS, routers, health
│       ├── database.py          # SQLite (SQLCipher) + DuckDB + helpers Fernet
│       ├── models.py            # AuditTrail : hash SHA-256 chaîné
│       └── routers/
│           ├── data.py          # POST /api/v1/data/ingest
│           └── sync.py          # POST /api/v1/sync/reconcile (CRDT LWW)
├── frontend/                    # React + Vite + TypeScript
│   └── src/
│       ├── components/          # Dashboard P2P (métriques, nœuds, événements)
│       └── api/syncthing.ts     # Client API Syncthing
├── config/
│   ├── nginx/
│   │   ├── nginx.conf           # TLS 1.3 only + ssl_verify_client on
│   │   └── certs/               # Généré par generate-certs.sh (gitignored)
│   └── syncthing/               # Config Syncthing runtime (gitignored)
├── data/
│   ├── db/                      # SQLite metadata.db + analytics.duckdb (volume)
│   └── shared_storage/          # Parquets chiffrés — répliqués par Syncthing
├── scripts/
│   └── generate-certs.sh        # Génération CA interne + serveur + client x509
├── tests/                       # pytest + locust
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Critères de validation POC

| Critère | Cible | Statut |
|---------|-------|--------|
| Réplication P2P | ≥ 3 nœuds, 0 perte de données | ⏳ |
| Résolution conflits CRDT | 0 conflit non résolu | ✅ (LWW implémenté) |
| Latence DuckDB | < 1s sur 1M lignes | ⏳ |
| Latence locale | < 100ms | ⏳ |
| Déploiement Docker | < 30 minutes | ✅ |
| Couverture tests | > 80% | ⏳ |
| Vulnérabilités critiques | 0 (Bandit + Trivy) | ⏳ |
| Documentation API | 100% Swagger | ✅ |
| Chiffrement au repos | AES-256 SQLite + Parquet | ✅ |
| Transport sécurisé | TLS 1.3 + mTLS x509 | ✅ |

---

## Conformité réglementaire

| Framework | Exigence | Réponse SDA |
|-----------|----------|-------------|
| **AUDPF** (Union Africaine, déc. 2025) | Données sous contrôle local | ✅ Aucune dépendance cloud externe |
| **RGPD / DORA / NIS2** | Chiffrement + traçabilité | ✅ AES-256 + audit trail SHA-256 |
| **Zero-trust** | Authentification de chaque nœud | ✅ Certificats x509 mutuels |

---

## Licence

Projet académique — tous droits réservés MPIGA-ODOUMBA Jesse / EIGSI 2026.
Usage pédagogique autorisé avec attribution.

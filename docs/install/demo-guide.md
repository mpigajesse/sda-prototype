# Guide de Démonstration Complète — 2 Nœuds SDA

**Contexte :** Node 1 = Windows 10 · Node 2 = Kali Linux  
**Durée estimée :** 30 minutes (déploiement) + 20 minutes (tests)

---

## 0. Architecture de la démo

```
┌──────────────────────────┐          ┌──────────────────────────┐
│   NODE 1 — Windows 10    │          │    NODE 2 — Kali Linux   │
│                          │          │                          │
│  docker compose up       │          │  docker compose up       │
│  ┌──────────────────┐    │          │    ┌──────────────────┐  │
│  │  FastAPI :8000   │    │          │    │  FastAPI :8000   │  │
│  │  DuckDB/SQLite   │    │          │    │  DuckDB/SQLite   │  │
│  │  Syncthing :8384 │    │          │    │  Syncthing :8384 │  │
│  └──────────────────┘    │          │    └──────────────────┘  │
│         │                │          │           │              │
│   Nginx :443 (mTLS)      │          │     Nginx :443 (mTLS)    │
└──────────┼───────────────┘          └───────────┼──────────────┘
           │                                       │
           └──── Syncthing P2P — port 22000 ────────┘
                  (TLS 1.3 · BEP Protocol)
                  shared_storage/ synchronized
```

**IPs de référence pour ce guide** (adapter à ton réseau) :

| Nœud | OS | IP LAN |
|------|----|--------|
| Node 1 | Windows 10 | `192.168.1.10` |
| Node 2 | Kali Linux | `192.168.1.20` |

---

## 1. Prérequis sur chaque nœud

### Node 1 — Windows 10

```powershell
# Vérifier Docker Desktop
docker --version        # >= 24.x
docker compose version  # >= 2.x

# Vérifier Git
git --version

# Vérifier que le pare-feu autorise les ports SDA
# Panneau de configuration > Pare-feu Windows > Autoriser une application
# Ports à ouvrir en entrée : 443 (HTTPS), 22000 (Syncthing P2P), 8384 (Syncthing GUI)
```

### Node 2 — Kali Linux

```bash
# Docker Engine
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # puis se reconnecter

# Vérifier
docker --version
docker compose version

# Ouvrir les ports dans UFW (si actif)
sudo ufw allow 443/tcp
sudo ufw allow 22000/tcp
sudo ufw allow 22000/udp
sudo ufw allow 8384/tcp
```

---

## 2. Cloner le dépôt sur chaque nœud

### Node 1 (PowerShell)
```powershell
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype
```

### Node 2 (bash)
```bash
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype
```

---

## 3. Générer les certificats TLS (une seule fois par nœud)

Chaque nœud a sa propre CA et ses propres certificats — c'est le modèle Zero-Trust du SDA.

### Node 1 (PowerShell via Git Bash ou WSL)
```bash
bash scripts/generate-certs.sh
# Vérifie que ces fichiers existent :
ls config/nginx/certs/
# ca.crt  ca.key  server.crt  server.key  client.crt  client.key
```

### Node 2 (bash)
```bash
bash scripts/generate-certs.sh
ls config/nginx/certs/
```

---

## 4. Configurer les variables d'environnement

### Sur chaque nœud, créer `.env` à partir du template :

```bash
cp .env.example .env
```

Éditer `.env` et renseigner :

```ini
# Clé SQLite (SQLCipher AES-256) — générer avec :
# python -c "import secrets; print(secrets.token_hex(32))"
DB_ENCRYPTION_KEY=<votre-cle-hex-64-chars>

# Clé Parquet (Fernet AES-128-CBC+HMAC) — générer avec :
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
PARQUET_FERNET_KEY=<votre-cle-fernet-44-chars>
```

> **Important** : utiliser des clés différentes sur chaque nœud est possible,
> mais les fichiers Parquet chiffrés ne seront pas déchiffrables entre nœuds.
> Pour la démo inter-nœuds, utiliser les **mêmes clés** sur les deux VMs.

---

## 5. Lancer le stack Docker sur chaque nœud

### Node 1 (PowerShell)
```powershell
docker compose --env-file .env up --build -d
# Attendre ~30 secondes le démarrage complet
docker compose ps
```

### Node 2 (bash)
```bash
docker compose --env-file .env up --build -d
sleep 30
docker compose ps
```

**Résultat attendu sur les deux nœuds :**

```
NAME            IMAGE           STATUS          PORTS
sda-nginx       nginx:1.25...   Up (healthy)    0.0.0.0:443->443/tcp
sda-backend     sda-backend     Up (healthy)    (internal)
sda-frontend    sda-frontend    Up (healthy)    (internal)
sda-syncthing   syncthing/...   Up              0.0.0.0:22000->22000/tcp
```

---

## 6. Vérifier le health check (test minimal)

### Node 1
```powershell
# Avec certificat client (mTLS)
curl --cacert config/nginx/certs/ca.crt `
     --cert   config/nginx/certs/client.crt `
     --key    config/nginx/certs/client.key `
     https://localhost/health
```

### Node 2
```bash
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     https://localhost/health
```

**Réponse attendue :**
```json
{
  "status": "operational",
  "architecture": "local-first / distributed",
  "central_dependency": "none",
  "offline_ready": true
}
```

---

## 7. Coupler les deux nœuds Syncthing (P2P)

Syncthing gère la réplication P2P du dossier `shared_storage/`.

### 7.1 Accéder à l'interface Syncthing sur chaque nœud

- **Node 1** : ouvrir `http://192.168.1.10:8384` dans le navigateur
- **Node 2** : ouvrir `http://192.168.1.20:8384` dans le navigateur

### 7.2 Récupérer les Device IDs

Sur chaque interface Syncthing :
1. Cliquer sur **Actions** (en haut à droite)
2. Cliquer **Afficher l'ID de l'appareil**
3. Copier le Device ID (format : `XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX`)

### 7.3 Ajouter Node 2 sur Node 1

Sur l'interface Node 1 :
1. **Ajouter un appareil distant** → coller le Device ID de Node 2
2. Nom : `SDA-KaliLinux`
3. Adresse : `tcp://192.168.1.20:22000`
4. Cocher le dossier **SDA_Shared**
5. **Enregistrer**

### 7.4 Accepter la connexion sur Node 2

Sur l'interface Node 2 :
1. Une notification apparaît : "Nouvel appareil détecté"
2. **Ajouter l'appareil** → cocher le dossier **SDA_Shared**
3. **Enregistrer**

### 7.5 Vérifier la synchronisation

Dans les deux interfaces Syncthing :
- Status du dossier SDA_Shared : **"À jour"** (icône verte)
- Connection P2P : **"Connecté"**

---

## 8. Tests fonctionnels complets

### Test 1 — Ingestion de données sur Node 1

```bash
# Depuis Node 1 (ou depuis n'importe quelle machine avec le certificat client)
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     -X POST https://192.168.1.10/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "tenant_id": "tenant_demo_albaraa",
       "data": {
         "metric": "cpu_usage",
         "value": 67.3,
         "node_id": "node-win10",
         "timestamp": "2026-05-25T18:00:00Z"
       }
     }'
```

**Réponse attendue :**
```json
{
  "status": "success",
  "tenant_id": "tenant_demo_albaraa",
  "record_hash": "a3f8...",
  "audit_id": 1,
  "parquet_path": "./data/shared_storage/tenant_demo_albaraa_storage.parquet"
}
```

### Test 2 — Vérifier la réplication sur Node 2

Après ~5-10 secondes (temps de sync Syncthing) :

```bash
# Sur Node 2 — vérifier que le fichier Parquet est arrivé
ls -la data/shared_storage/
# tenant_demo_albaraa_storage.parquet doit être présent
```

### Test 3 — Ingérer depuis Node 2

```bash
# Depuis Node 2
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     -X POST https://192.168.1.20/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "tenant_id": "tenant_demo_albaraa",
       "data": {
         "metric": "memory_mb",
         "value": 4096,
         "node_id": "node-kali",
         "timestamp": "2026-05-25T18:01:00Z"
       }
     }'
```

Vérifier sur Node 1 que le Parquet de Node 2 est synchronisé.

### Test 4 — Conflit Syncthing (scénario CRDT)

Simule deux nœuds qui modifient la même donnée hors-ligne puis se reconnectent.

```bash
# ÉTAPE 1 : Déconnecter les nœuds (simuler coupure réseau)
# Sur Node 2 :
docker compose stop syncthing

# ÉTAPE 2 : Ingérer sur les deux nœuds simultanément
# Sur Node 1 :
curl --cacert config/nginx/certs/ca.crt \
     --cert config/nginx/certs/client.crt \
     --key config/nginx/certs/client.key \
     -X POST https://192.168.1.10/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"tenant_conflict_test","data":{"value":100,"node":"win10"}}'

# Sur Node 2 :
curl --cacert config/nginx/certs/ca.crt \
     --cert config/nginx/certs/client.crt \
     --key config/nginx/certs/client.key \
     -X POST https://192.168.1.20/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"tenant_conflict_test","data":{"value":200,"node":"kali"}}'

# ÉTAPE 3 : Reconnecter Syncthing
# Sur Node 2 :
docker compose start syncthing
# Attendre ~15s — Syncthing créera un fichier .sync-conflict-*

# ÉTAPE 4 : Vérifier le conflit
ls data/shared_storage/
# tenant_conflict_test_storage.sync-conflict-*.parquet doit apparaître

# ÉTAPE 5 : Réconcilier via l'API CRDT LWW
curl --cacert config/nginx/certs/ca.crt \
     --cert config/nginx/certs/client.crt \
     --key config/nginx/certs/client.key \
     -X POST https://192.168.1.10/api/v1/sync/reconcile
```

**Réponse attendue :**
```json
{
  "status": "reconciled",
  "conflicts_resolved": 1,
  "merged_records": 1,
  "timestamp": "2026-05-25T18:05:00Z"
}
```

Vérifier que le fichier `.sync-conflict-*` a disparu :
```bash
ls data/shared_storage/
# Plus de fichier sync-conflict — conflit résolu ✅
```

### Test 5 — Audit Trail (traçabilité blockchain-style)

```bash
# Ingérer plusieurs fois pour créer une chaîne
for i in 1 2 3; do
  curl -s --cacert config/nginx/certs/ca.crt \
       --cert config/nginx/certs/client.crt \
       --key config/nginx/certs/client.key \
       -X POST https://192.168.1.10/api/v1/data/ingest \
       -H "Content-Type: application/json" \
       -d "{\"tenant_id\":\"tenant_audit\",\"data\":{\"seq\":$i}}" | python3 -m json.tool
done

# Chaque réponse doit avoir un record_hash différent
# et audit_id croissant (1, 2, 3...)
```

---

## 9. Interface graphique (Swagger UI)

Accéder à la documentation API interactive :

```
https://192.168.1.10/docs    ← Node 1
https://192.168.1.20/docs    ← Node 2
```

> Le navigateur demandera d'installer le certificat `config/nginx/certs/ca.crt`
> comme CA de confiance, ou affichera un avertissement SSL (normal en dev).

Via Swagger, tester :
- `POST /api/v1/data/ingest` — cliquer **Try it out**
- `POST /api/v1/sync/reconcile`
- `GET /health`

---

## 10. Interface Frontend React

```
https://192.168.1.10/     ← Dashboard Node 1
https://192.168.1.20/     ← Dashboard Node 2
```

Le frontend expose :
- Vue tableau de bord du nœud
- Historique des ingestions
- Status Syncthing (via `/syncthing-api/`)

---

## 11. Vérification de la sécurité TLS

```bash
# Vérifier que TLS 1.2 est refusé (seul TLS 1.3 accepté)
openssl s_client -connect 192.168.1.10:443 -tls1_2 2>&1 | grep "handshake failure"
# Attendu : "handshake failure" — TLS 1.2 rejeté ✅

# Vérifier TLS 1.3 fonctionne
openssl s_client -connect 192.168.1.10:443 -tls1_3 2>&1 | grep "Protocol"
# Attendu : "Protocol  : TLSv1.3" ✅

# Vérifier que sans certificat client on est rejeté (mTLS)
curl -k https://192.168.1.10/api/v1/data/ingest 2>&1
# Attendu : "400 No required SSL certificate was sent" ✅
```

---

## 12. Scan de sécurité Bandit

```bash
# Sur n'importe quel nœud avec Python
pip install bandit
bandit -r backend/app/ --severity-level medium
# Résultat attendu : 0 HIGH, 0 CRITICAL
```

---

## 13. Arrêt propre du stack

### Node 1 (PowerShell)
```powershell
docker compose down
# Les données persistent dans data/ (volumes montés)
```

### Node 2 (bash)
```bash
docker compose down
```

---

## Checklist de validation POC complète

```
[ ] Health check répond sur les 2 nœuds         ✓/✗
[ ] Ingestion réussie sur Node 1                  ✓/✗
[ ] Ingestion réussie sur Node 2                  ✓/✗
[ ] Parquet synchronisé Node 1 → Node 2           ✓/✗
[ ] Parquet synchronisé Node 2 → Node 1           ✓/✗
[ ] Conflit Syncthing créé (.sync-conflict-*)     ✓/✗
[ ] Réconciliation CRDT /reconcile OK             ✓/✗
[ ] Fichier conflit supprimé après réconciliation  ✓/✗
[ ] Audit trail avec hash chaîné                  ✓/✗
[ ] TLS 1.2 refusé, TLS 1.3 accepté              ✓/✗
[ ] mTLS : rejet sans certificat client           ✓/✗
[ ] Swagger UI accessible sur /docs               ✓/✗
[ ] Frontend React accessible sur /              ✓/✗
[ ] Syncthing GUI accessible sur :8384            ✓/✗
[ ] Bandit : 0 HIGH/CRITICAL                      ✓/✗
```

---

## Dépannage rapide

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| `502 Bad Gateway` sur `/` | Frontend pas démarré | `docker compose logs sda-frontend` |
| `400 No required SSL certificate` | mTLS actif — fournir le certificat client | Ajouter `--cert` et `--key` au curl |
| Syncthing ne se connecte pas | Pare-feu bloque port 22000 | Ouvrir 22000 TCP+UDP sur les 2 VMs |
| `.sync-conflict-*` ne disparaît pas | `/reconcile` n'a pas été appelé | `POST /api/v1/sync/reconcile` |
| `500 Storage error` sous charge | DuckDB write-lock (comportement normal) | 1 seul writer par nœud en production |
| Certificat non reconnu | CA non installée dans le navigateur | Importer `config/nginx/certs/ca.crt` |

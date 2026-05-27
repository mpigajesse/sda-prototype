# Guide de Démonstration Complète — 3 Nœuds SDA

**Contexte :**
- Node 1 = **PC physique Windows 11** — prototype déjà opérationnel ✅
- Node 2 = VM Ubuntu 26.04 LTS "resolute" (vCPU: 2, RAM: 4 GB, Disk: 120 GB LVM)
- Node 3 = VM Kali Linux

**Durée estimée :** 15 min (Node 1 déjà prêt) + 30 min (Nodes 2 & 3) + 20 min (tests)

---

## 0. Architecture de la démo 3 nœuds

```
┌──────────────────────────┐
│  NODE 1 — Windows 11     │  ← PC physique, prototype actif
│  ✅ Déjà opérationnel    │
│  ┌──────────────────┐    │
│  │  FastAPI :8000   │    │
│  │  DuckDB/SQLite   │    │
│  │  Syncthing :8384 │    │
│  └──────────────────┘    │
│   Nginx :443 (mTLS)      │
└──────────┬───────────────┘
           │   Syncthing P2P
           │   port 22000
           │   TLS 1.3 · BEP
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌──────────────────────────┐     ┌──────────────────────────┐
│  NODE 2 — Ubuntu 26.04 VM│     │  NODE 3 — Kali Linux VM  │
│                          │─────│                          │
│  docker compose up       │     │  docker compose up       │
│  ┌──────────────────┐    │     │  ┌──────────────────┐    │
│  │  FastAPI :8000   │    │     │  │  FastAPI :8000   │    │
│  │  DuckDB/SQLite   │    │     │  │  DuckDB/SQLite   │    │
│  │  Syncthing :8384 │    │     │  │  Syncthing :8384 │    │
│  └──────────────────┘    │     │  └──────────────────┘    │
│   Nginx :443 (mTLS)      │     │   Nginx :443 (mTLS)      │
└──────────────────────────┘     └──────────────────────────┘

         shared_storage/ synchronisé entre les 3 nœuds (P2P mesh)
```

**IPs de référence** (adapter à ton réseau LAN) :

| Nœud | OS | Type | IP LAN | Statut |
|------|----|------|--------|--------|
| Node 1 | Windows 11 | PC physique | LAN: `192.168.200.1` / WAN: `192.168.1.x` | ✅ Opérationnel |
| Node 2 | Ubuntu 26.04 LTS "resolute" | VM | LAN: `192.168.200.130` / WAN: `192.168.1.40` | ✅ Opérationnel |
| Node 3 | Kali Linux | VM | LAN: `192.168.200.128` / WAN: `192.168.1.20` | ✅ Opérationnel |

> Trouver ton IP sur Windows 11 : `ipconfig` → "Adresse IPv4"
> Trouver ton IP sur Ubuntu/Kali : `ip a show eth0` ou `ip a show ens33`

---

## 1. Node 1 — Windows 11 (PC physique, déjà opérationnel)

Le prototype tourne déjà. Vérification rapide :

```powershell
# Dans D:\PFE\sda-prototype
docker compose ps
```

**Résultat attendu :**
```
NAME            STATUS
sda-nginx       Up (healthy)
sda-backend     Up (healthy)
sda-frontend    Up (healthy)
sda-syncthing   Up
```

Si le stack n'est pas démarré :
```powershell
docker compose --env-file .env up --build -d
```

Test rapide health check :
```powershell
curl -k https://localhost/health
# Attendu : {"status":"operational",...}
```

---

## 2. Ouvrir les ports pare-feu sur Windows 11

Pour que les VMs puissent se connecter au Node 1 :

```powershell
# Exécuter en tant qu'Administrateur
New-NetFirewallRule -DisplayName "SDA-HTTPS"      -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow
New-NetFirewallRule -DisplayName "SDA-Syncthing"  -Direction Inbound -Protocol TCP -LocalPort 22000 -Action Allow
New-NetFirewallRule -DisplayName "SDA-SyncUDP"    -Direction Inbound -Protocol UDP -LocalPort 22000 -Action Allow
New-NetFirewallRule -DisplayName "SDA-SyncGUI"    -Direction Inbound -Protocol TCP -LocalPort 8384  -Action Allow
```

---

## 3. Node 2 — VM Ubuntu 26.04 LTS "resolute"

> **Identifiants VM** : user `ubuntu` / mot de passe `ubuntu` — `sudo su -` pour root.  
> **IP LAN VMnet1 :** `192.168.200.130` | **IP WAN :** `192.168.1.40`

### 3.1 Prérequis (spécificités Ubuntu 26.04)

> Ubuntu 26.04 ne distribue pas `docker-compose-plugin` dans ses dépôts par défaut.
> Le dépôt officiel Docker doit être ajouté manuellement.

```bash
# Paquets de base
sudo apt update && sudo apt install -y docker.io git curl openssl python3-pip

# Ajouter le dépôt officiel Docker (requis pour docker-compose-plugin)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-compose-plugin

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
# newgrp absent par défaut sur Ubuntu 26.04 — installer util-linux-extra
sudo apt install -y util-linux-extra
newgrp docker

# Vérifier
docker --version        # Docker version 29.1.3
docker compose version  # Docker Compose version v5.1.4
```

Ouvrir les ports pare-feu :
```bash
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw allow 22000/tcp
sudo ufw allow 22000/udp
sudo ufw allow 8384/tcp
sudo ufw reload
```

### 3.2 Cloner et configurer

```bash
mkdir -p ~/Desktop/PFE && cd ~/Desktop/PFE
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype

# Générer les certificats TLS pour ce nœud
bash scripts/generate-certs.sh

# Créer .env avec les mêmes clés que Node 1 (OBLIGATOIRE pour Parquet inter-nœuds)
cat > .env <<'EOF'
DB_ENCRYPTION_KEY=4a82d9f9199d1159159b55ef7359bc1c035d5587024e3ed15edb4f8f4b30bfb9
PARQUET_FERNET_KEY=PGKzI2PL8qrYh_IFs98fAguugjtpcOOzv4P05NbQ1lk=
EOF
```

> **Important** : les clés doivent être **identiques** à Node 1 — sinon les Parquets chiffrés ne seront pas lisibles entre nœuds.

### 3.3 Démarrer le stack

```bash
docker compose up --build -d
sleep 30
docker compose ps
```

### 3.4 Injection clé API Syncthing

```bash
bash scripts/setup-syncthing-key.sh
# → extrait la clé de sda-syncthing + recharge nginx à chaud
```

### 3.5 Vérification

```bash
curl -k https://localhost/health
# Attendu : {"status":"operational",...}

# Dashboard accessible depuis n'importe quelle machine du LAN :
# https://192.168.200.130/
```

---

## 4. Node 3 — VM Kali Linux

### 4.1 Prérequis

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git curl openssl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Se déconnecter/reconnecter pour appliquer le groupe docker

# Ouvrir les ports (si UFW actif)
sudo ufw allow 443/tcp 22000/tcp 22000/udp 8384/tcp
```

### 4.2 Cloner et configurer

```bash
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype

# Générer les certificats
bash scripts/generate-certs.sh

# Copier .env depuis Node 1 (mêmes clés !)
# Soit manuellement, soit via scp depuis Node 1 :
# scp user@192.168.1.10:/path/sda-prototype/.env .env
cp .env.example .env
nano .env   # coller les mêmes clés que Node 1
```

### 4.3 Démarrer le stack

```bash
docker compose --env-file .env up --build -d
sleep 30
docker compose ps
```

### 4.4 Vérification

```bash
curl -k https://localhost/health
```

---

## 5. Coupler les 3 nœuds Syncthing (maillage P2P)

### 5.1 Accéder aux interfaces Syncthing

| Nœud | URL Syncthing GUI (accès local) |
|------|--------------------------------|
| Node 1 — Win11 | `http://localhost:8384` |
| Node 2 — Ubuntu | `http://localhost:8384` (depuis la VM) |
| Node 3 — Kali  | `http://localhost:8384` (depuis la VM) |

### 5.2 Récupérer les Device IDs (sur chaque nœud)

Dans chaque interface Syncthing :
1. **Actions** (bouton en haut à droite) → **Afficher l'ID de l'appareil**
2. Copier le Device ID (format : `XXXXXXX-XXXXXXX-...`)

Noter les 3 IDs :
```
Node 1 (Win11) : _______________________________________
Node 2 (Ubuntu) : _______________________________________
Node 3 (Kali)  : _______________________________________
```

### 5.3 Ajouter les pairs (sur chaque nœud)

Sur **Node 1** — ajouter Node 2 ET Node 3 :
1. **Ajouter un appareil distant**
2. Coller Device ID de Node 2 → Nom : `Node2-Ubuntu` → Adresse : `tcp://192.168.200.130:22000` → Cocher `SDA_Shared` → Enregistrer
3. Répéter pour Node 3 → Nom : `Node3-Kali` → Adresse : `tcp://192.168.200.128:22000`

Sur **Node 2** — accepter les connexions entrantes (notification Syncthing) et ajouter Node 3.

Sur **Node 3** — accepter les connexions entrantes.

### 5.4 Vérifier le maillage

Dans chaque interface Syncthing :
- `SDA_Shared` : statut **"À jour"** (fond vert)
- 2 appareils **"Connecté"** visibles

---

## 6. Tests fonctionnels complets

### Test 1 — Ingest depuis Node 1 (Win11)

```powershell
# PowerShell sur Node 1
$cert = "config/nginx/certs/client.crt"
$key  = "config/nginx/certs/client.key"
$ca   = "config/nginx/certs/ca.crt"

Invoke-RestMethod `
  -Uri "https://localhost/api/v1/data/ingest" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"tenant_id":"tenant_albaraa","data":{"metric":"cpu","value":42,"node":"win11"}}' `
  -SkipCertificateCheck
```

Ou via curl (Git Bash) :
```bash
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     -X POST https://localhost/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"tenant_albaraa","data":{"metric":"cpu","value":42,"node":"win11"}}'
```

**Réponse attendue :**
```json
{"status":"success","tenant_id":"tenant_albaraa","record_hash":"...","audit_id":1}
```

### Test 2 — Vérifier la réplication sur Node 2 et Node 3

Après ~5-15 secondes (délai Syncthing) :

```powershell
# Sur Node 2 (PowerShell)
dir data\shared_storage\
# tenant_albaraa_storage.parquet doit apparaître ✅
```

```bash
# Sur Node 3 (bash)
ls -lh data/shared_storage/
# tenant_albaraa_storage.parquet ✅
```

### Test 3 — Ingest depuis Node 3 (Kali)

```bash
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     -X POST https://localhost/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"tenant_albaraa","data":{"metric":"memory","value":8192,"node":"kali"}}'
```

Vérifier que le Parquet mis à jour arrive sur Node 1 et Node 2.

### Test 4 — Scénario CRDT Conflit (hors-ligne → réconciliation)

```bash
# ÉTAPE 1 : Couper Syncthing sur Node 3 (simule coupure réseau)
# Sur Node 3 :
docker compose stop syncthing

# ÉTAPE 2 : Ingérer en parallèle sur Node 1 ET Node 3
# Sur Node 1 :
curl --cacert config/nginx/certs/ca.crt \
     --cert config/nginx/certs/client.crt \
     --key config/nginx/certs/client.key \
     -X POST https://localhost/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"tenant_conflict","data":{"value":100,"node":"win11"}}'

# Sur Node 3 (simultanément) :
curl --cacert config/nginx/certs/ca.crt \
     --cert config/nginx/certs/client.crt \
     --key config/nginx/certs/client.key \
     -X POST https://localhost/api/v1/data/ingest \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"tenant_conflict","data":{"value":200,"node":"kali"}}'

# ÉTAPE 3 : Reconnecter Syncthing sur Node 3
docker compose start syncthing
# Attendre ~15s — Syncthing créera un .sync-conflict-* sur Node 1

# ÉTAPE 4 : Vérifier le conflit sur Node 1
ls data/shared_storage/
# tenant_conflict_storage.sync-conflict-*.parquet ← conflit détecté ✅

# ÉTAPE 5 : Réconcilier (CRDT LWW)
curl --cacert config/nginx/certs/ca.crt \
     --cert config/nginx/certs/client.crt \
     --key config/nginx/certs/client.key \
     -X POST https://192.168.1.10/api/v1/sync/reconcile
```

**Réponse attendue :**
```json
{"status":"reconciled","conflicts_resolved":1,"merged_records":1,"timestamp":"..."}
```

```bash
# Vérifier que le fichier conflit a disparu
ls data/shared_storage/
# Plus de .sync-conflict-* ✅
```

### Test 5 — Audit Trail chaîné (traçabilité)

```bash
# Ingérer 3 fois depuis Node 1
for i in 1 2 3; do
  echo "=== Ingest $i ==="
  curl -s --cacert config/nginx/certs/ca.crt \
       --cert config/nginx/certs/client.crt \
       --key config/nginx/certs/client.key \
       -X POST https://localhost/api/v1/data/ingest \
       -H "Content-Type: application/json" \
       -d "{\"tenant_id\":\"tenant_audit\",\"data\":{\"seq\":$i}}" | python3 -m json.tool
done
```

Vérifier que :
- `audit_id` est croissant (1, 2, 3)
- `record_hash` est différent à chaque fois
- Les hashes sont chaînés (chaque hash inclut le `previous_hash`)

---

## 7. Interface Swagger UI (API interactive)

Accéder depuis n'importe quel navigateur sur le réseau LAN :

```
https://localhost/docs           ← Nœud local (depuis la machine elle-même)
https://192.168.200.1/docs       ← Node 1 Win11 (depuis le LAN VMnet1)
https://192.168.200.130/docs     ← Node 2 Ubuntu (depuis le LAN VMnet1)
https://192.168.200.128/docs     ← Node 3 Kali (depuis le LAN VMnet1)
```

> Accepter l'alerte SSL (certificat auto-signé) ou importer `ca.crt`
> dans le magasin de certificats du navigateur.

Via Swagger : tester **Try it out** sur :
- `POST /api/v1/data/ingest`
- `POST /api/v1/sync/reconcile`
- `GET /health`

---

## 8. Frontend React (Dashboard)

```
https://192.168.200.1/      ← Dashboard Node 1 (Win11)
https://192.168.200.130/    ← Dashboard Node 2 (Ubuntu)
https://192.168.200.128/    ← Dashboard Node 3 (Kali)
```

---

## 9. Vérifications sécurité TLS + mTLS

```bash
# Depuis Node 3 (Kali) — tester TLS 1.2 refusé
openssl s_client -connect 192.168.200.1:443 -tls1_2 2>&1 | grep -E "handshake|error"
# Attendu : handshake failure ✅ (TLS 1.2 rejeté)

# TLS 1.3 accepté
openssl s_client -connect 192.168.200.1:443 -tls1_3 2>&1 | grep "Protocol"
# Attendu : Protocol : TLSv1.3 ✅

# mTLS — requête sans certificat client rejetée
curl -k https://192.168.200.1/api/v1/data/ingest -X POST -H "Content-Type: application/json" -d '{}'
# Attendu : 400 No required SSL certificate was sent ✅
```

---

## 10. Arrêt propre

```powershell
# Node 1 & Node 2 (PowerShell)
docker compose down
```
```bash
# Node 3 (Kali)
docker compose down
```

Les données persistent dans `data/` (volumes montés — non supprimés par `docker compose down`).

---

## Checklist POC 3 nœuds

```
Infrastructure
[ ] Node 1 Win11   : docker compose ps → tous healthy         ✓/✗  ← ✅ validé
[ ] Node 2 Ubuntu  : docker compose ps → tous healthy         ✓/✗  ← ✅ validé
[ ] Node 3 Kali    : docker compose ps → tous healthy         ✓/✗  ← ✅ validé
[ ] setup-syncthing-key.sh lancé sur chaque nœud              ✓/✗  ← ✅ validé
[ ] Dashboard Syncthing — métriques visibles (pas d'erreur)   ✓/✗  ← ✅ validé
[ ] Syncthing maillage : 3 nœuds "Connecté" dans GUI          ✓/✗  ← ⏳ à faire

Fonctionnel
[ ] Ingest Node 1 → succès (status:success)                   ✓/✗
[ ] Ingest Node 3 → succès                                    ✓/✗
[ ] Réplication Node 1 → Node 2 & 3 (Parquet synchronisé)     ✓/✗
[ ] Réplication Node 3 → Node 1 & 2                           ✓/✗
[ ] Conflit .sync-conflict-* créé                             ✓/✗
[ ] Réconciliation /reconcile → conflicts_resolved: 1         ✓/✗
[ ] Fichier conflit supprimé après réconciliation              ✓/✗
[ ] Audit trail : audit_id croissant, record_hash unique       ✓/✗

Sécurité
[ ] TLS 1.2 refusé, TLS 1.3 accepté                          ✓/✗
[ ] mTLS : 400 sans certificat client                         ✓/✗

Interface
[ ] Swagger /docs accessible sur les 3 nœuds                  ✓/✗
[ ] Frontend / accessible sur les 3 nœuds                     ✓/✗
[ ] Syncthing GUI :8384 accessible                            ✓/✗
```

---

## Dépannage rapide

| Symptôme | Cause | Solution |
|----------|-------|----------|
| VM ne joint pas Node 1 | Pare-feu Win11 | Exécuter les règles PowerShell du §2 |
| "Impossible de joindre Syncthing" | clé API manquante dans nginx | `bash scripts/setup-syncthing-key.sh` |
| `docker-compose-plugin not found` sur Ubuntu | Dépôt Docker absent | Ajouter le dépôt officiel Docker (§3.1) |
| `newgrp: not found` sur Ubuntu | `util-linux-extra` absent | `sudo apt install util-linux-extra` |
| `502 Bad Gateway` sur `/` | Frontend non démarré | `docker compose logs sda-frontend` |
| `400 No required SSL` | mTLS actif — normal | Fournir `--cert` et `--key` |
| Syncthing ne se connecte pas | Port 22000 bloqué | Vérifier pare-feu sur les 2 nœuds |
| `.sync-conflict-*` reste | `/reconcile` non appelé | `POST /api/v1/sync/reconcile` |
| `500 Storage error` sous charge | DuckDB write-lock | Normal — 1 writer par nœud en prod |
| Certificat invalide navigateur | CA auto-signée | Importer `config/nginx/certs/ca.crt` |
| Parquet illisible inter-nœuds | Clés Fernet différentes | Utiliser les mêmes clés dans `.env` |

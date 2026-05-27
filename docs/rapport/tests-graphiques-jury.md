# Tests Graphiques — Démonstration Jury SDA

**Cluster actif :**
- Node 1 — Win11 `192.168.200.1` (PC physique)
- Node 2 — Ubuntu `192.168.200.130` (VM VMware)
- Node 3 — Kali `192.168.200.128` (VM VMware)

**Prérequis :** Les 3 nœuds sont démarrés, Syncthing synchronisé à 100%.

---

## Scénario 1 — État de santé du cluster (Health Check)

**Ce que ça prouve :** L'architecture local-first fonctionne — chaque nœud est autonome et opérationnel indépendamment.

### Étapes

**Sur chaque nœud, ouvrir le dashboard :**
```
https://localhost/
```

**Sur chaque nœud, vérifier via terminal :**
```bash
# Node 1 Win11
docker compose exec sda-backend curl -s http://localhost:8000/health | python -m json.tool

# Node 2 Ubuntu
docker compose exec sda-backend curl -s http://localhost:8000/health | python3 -m json.tool

# Node 3 Kali
docker compose exec sda-backend curl -s http://localhost:8000/health | python3 -m json.tool
```

**Réponse attendue sur les 3 nœuds :**
```json
{
  "status": "operational",
  "architecture": "local-first / distributed",
  "offline_ready": true
}
```

### Captures à prendre

| # | Quoi capturer | Nœud | Nom fichier |
|---|---------------|------|------------|
| 1a | Dashboard frontend — section "Statut Backend" vert | Win11 | `test1_health_win11.png` |
| 1b | Dashboard frontend — section "Statut Backend" vert | Ubuntu | `test1_health_ubuntu.png` |
| 1c | Dashboard frontend — section "Statut Backend" vert | Kali | `test1_health_kali.png` |
| 1d | Terminal : réponse JSON `"status": "operational"` | Win11 | `test1_api_health_win11.png` |

---

## Scénario 2 — Réplication P2P : Win11 → Ubuntu + Kali

**Ce que ça prouve :** Une donnée injectée sur Node 1 se retrouve automatiquement sur Node 2 et Node 3 sans action manuelle — c'est le cœur du système SDA.

### Étapes

**Étape A — Avant injection : noter l'état initial des fichiers Parquet**

Sur Win11 (PowerShell) :
```powershell
docker compose exec sda-backend ls -lh /app/data/shared_storage/
```

Sur Ubuntu et Kali (terminal) :
```bash
ls -lh ~/Desktop/PFE/sda-prototype/data/shared_storage/   # Ubuntu
ls -lh ~/PFE/sda-prototype/data/shared_storage/            # Kali
```
→ **Capturer l'état AVANT** (liste fichiers + timestamps)

**Étape B — Injecter des données sur Win11**

```powershell
# Win11 PowerShell
curl -sk `
  --cert config/nginx/certs/client.crt `
  --key config/nginx/certs/client.key `
  -X POST https://localhost/api/v1/data/ingest `
  -H "Content-Type: application/json" `
  -d '{"tenant_id": "demo_jury", "data": {"test": "replication_p2p", "source": "win11", "timestamp": "2026-05-27T12:00:00"}}'
```

→ **Capturer la réponse JSON** avec `audit_id` et `record_hash`

**Étape C — Attendre 15–30 secondes, vérifier sur Ubuntu et Kali**

```bash
# Ubuntu
watch -n 2 "ls -lh ~/Desktop/PFE/sda-prototype/data/shared_storage/ | grep demo_jury"

# Kali
watch -n 2 "ls -lh ~/PFE/sda-prototype/data/shared_storage/ | grep demo_jury"
```

→ **Capturer le moment où le fichier apparaît** sur chaque VM

**Étape D — Lire le fichier Parquet depuis Ubuntu (preuve du contenu)**

```bash
# Ubuntu
docker compose exec sda-backend python3 -c "
import duckdb
result = duckdb.execute(\"SELECT tenant_id, data, created_at FROM read_parquet('/app/data/shared_storage/demo_jury_storage.parquet') LIMIT 5\").fetchall()
for row in result: print(row)
"
```

### Captures à prendre

| # | Quoi capturer | Nœud | Nom fichier |
|---|---------------|------|------------|
| 2a | Liste fichiers AVANT injection | Win11 | `test2_before_win11.png` |
| 2b | Commande curl + réponse JSON `record_hash` | Win11 | `test2_ingest_win11.png` |
| 2c | Fichier `demo_jury_storage.parquet` apparu | Ubuntu | `test2_replicated_ubuntu.png` |
| 2d | Fichier `demo_jury_storage.parquet` apparu | Kali | `test2_replicated_kali.png` |
| 2e | Lecture DuckDB du contenu repliqué | Ubuntu | `test2_duckdb_read_ubuntu.png` |

---

## Scénario 3 — Ingestion multi-nœuds simultanée

**Ce que ça prouve :** Chaque nœud peut écrire indépendamment, les données se consolident dans un espace partagé — architecture distribuée symétrique.

### Étapes

**Injecter depuis les 3 nœuds (quasi-simultané, ~5 s d'écart)**

Win11 :
```powershell
curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key `
  -X POST https://localhost/api/v1/data/ingest `
  -H "Content-Type: application/json" `
  -d '{"tenant_id": "multinode_test", "data": {"node": "win11", "value": 100}}'
```

Ubuntu :
```bash
curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key \
  -X POST https://localhost/api/v1/data/ingest \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "multinode_test", "data": {"node": "ubuntu", "value": 200}}'
```

Kali :
```bash
curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key \
  -X POST https://localhost/api/v1/data/ingest \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "multinode_test", "data": {"node": "kali", "value": 300}}'
```

**Après synchronisation (~30 s), requête analytique globale depuis Win11 :**

```powershell
docker compose exec sda-backend python3 -c "
import duckdb, glob
files = glob.glob('/app/data/shared_storage/*.parquet')
result = duckdb.execute(f\"SELECT tenant_id, data FROM read_parquet({files}) WHERE tenant_id='multinode_test' ORDER BY created_at\").fetchall()
for r in result: print(r)
"
```

→ Les données des 3 nœuds doivent apparaître dans une seule requête.

### Captures à prendre

| # | Quoi capturer | Nœud | Nom fichier |
|---|---------------|------|------------|
| 3a | Ingestion sur Win11 | Win11 | `test3_ingest_win11.png` |
| 3b | Ingestion sur Ubuntu | Ubuntu | `test3_ingest_ubuntu.png` |
| 3c | Ingestion sur Kali | Kali | `test3_ingest_kali.png` |
| 3d | Requête DuckDB agrégeant les 3 nœuds | Win11 | `test3_global_query_win11.png` |

---

## Scénario 4 — Sécurité mTLS : accès refusé sans certificat

**Ce que ça prouve :** Le système est sécurisé — seuls les clients authentifiés par certificat X.509 peuvent accéder aux données.

### Étapes

**Test A — Accès refusé sans certificat client**

```powershell
# Win11 — sans certificat → doit retourner HTTP 400
curl -sk https://localhost/health
```

Réponse attendue :
```html
<html>
<head><title>400 No required SSL certificate was sent</title></head>
```

**Test B — Accès autorisé avec certificat client**

```powershell
# Win11 — avec certificat → doit retourner 200 OK
curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key https://localhost/health
```

Réponse attendue :
```json
{"status": "operational", "architecture": "local-first / distributed", "offline_ready": true}
```

**Test C — Démonstration navigateur Chrome (visuel)**

1. Ouvrir Chrome sur Win11
2. Aller sur `https://localhost/`
3. Cliquer sur le cadenas → "La connexion est sécurisée" → "Le certificat est valide"
4. Afficher le certificat : CN=`sda-client-node-1`, CA=`SDA Internal CA`

### Captures à prendre

| # | Quoi capturer | Nœud | Nom fichier |
|---|---------------|------|------------|
| 4a | Réponse `400 No required SSL certificate` (sans cert) | Win11 | `test4_rejected_no_cert.png` |
| 4b | Réponse `200 operational` (avec cert) | Win11 | `test4_accepted_with_cert.png` |
| 4c | Chrome cadenas → "Connexion sécurisée" | Win11 | `test4_chrome_padlock.png` |
| 4d | Détails du certificat client dans Chrome | Win11 | `test4_chrome_cert_details.png` |

---

## Scénario 5 — Résistance au mode hors-ligne (Offline-First)

**Ce que ça prouve :** L'architecture local-first est réelle — un nœud fonctionne sans réseau, les données sont capturées localement et synchronisées à la reconnexion.

### Étapes

**Étape A — Isoler Ubuntu (simuler déconnexion réseau)**

Sur Win11 (PowerShell) — désactiver VMnet1 vers Ubuntu :
```powershell
# Vérifier que Ubuntu est bien connecté avant
ping 192.168.200.130

# Option 1 : Sur la VM Ubuntu, désactiver l'interface ens37
# (à faire dans la console VMware ou sur Ubuntu directement)
```

Sur Ubuntu :
```bash
sudo ip link set ens37 down   # Désactiver VMnet1 (interface P2P)
# Ubuntu est maintenant isolé du cluster
```

**Étape B — Injecter des données sur Ubuntu pendant la déconnexion**

```bash
# Ubuntu (hors-ligne du P2P)
curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key \
  -X POST https://localhost/api/v1/data/ingest \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "offline_test", "data": {"node": "ubuntu_offline", "status": "written_while_disconnected"}}'
```

**Étape C — Vérifier que Win11 n'a PAS encore le fichier**

```powershell
ls data/shared_storage/ | grep offline_test
# Doit être vide
```

**Étape D — Reconnecter Ubuntu**

```bash
# Ubuntu
sudo ip link set ens37 up    # Réactiver VMnet1
```

**Étape E — Observer la synchronisation automatique (~15–30 s)**

```powershell
# Win11 — attendre l'apparition
watch -n 3 ls data/shared_storage/  # PowerShell : boucle while
while ($true) { ls data\shared_storage\ | grep offline; Start-Sleep 3 }
```

### Captures à prendre

| # | Quoi capturer | Nœud | Nom fichier |
|---|---------------|------|------------|
| 5a | Syncthing GUI Ubuntu — nœud Win11 "Déconnecté" | Ubuntu | `test5_ubuntu_offline.png` |
| 5b | Injection réussie sur Ubuntu hors-ligne | Ubuntu | `test5_ingest_offline.png` |
| 5c | Win11 — fichier absent pendant déconnexion | Win11 | `test5_win11_no_file_yet.png` |
| 5d | Reconnexion Ubuntu — Syncthing repasse à 100% | Ubuntu | `test5_reconnected.png` |
| 5e | Win11 — fichier apparu après reconnexion | Win11 | `test5_win11_file_appeared.png` |

---

## Scénario 6 — Audit Trail : traçabilité cryptographique

**Ce que ça prouve :** Chaque opération est horodatée et liée par hash SHA-256 — toute modification ultérieure des données serait détectable (tamper detection).

### Étapes

**Afficher la chaîne d'audit depuis Win11 :**

```powershell
docker compose exec sda-backend python3 -c "
from sqlalchemy import create_engine, text
engine = create_engine('sqlite:////app/data/db/metadata_enc.db')
# Note: en production, la DB est chiffrée SQLCipher
# Pour la démo, interroger via le backend FastAPI
"
```

**Via l'API (si endpoint /audit disponible) :**
```powershell
curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key \
  https://localhost/api/v1/data/audit | python -m json.tool
```

**Ou via DuckDB — lire les métadonnées :**
```powershell
docker compose exec sda-backend python3 -c "
import duckdb, glob
files = glob.glob('/app/data/shared_storage/*.parquet')
if files:
    result = duckdb.execute(f'SELECT tenant_id, record_hash, created_at FROM read_parquet({files}) ORDER BY created_at DESC LIMIT 10').fetchall()
    for r in result: print(r)
"
```

### Captures à prendre

| # | Quoi capturer | Nœud | Nom fichier |
|---|---------------|------|------------|
| 6a | Liste des enregistrements avec `record_hash` visible | Win11 | `test6_audit_trail.png` |
| 6b | Deux enregistrements consécutifs — hashes différents | Win11 | `test6_hash_chaining.png` |

---

## Scénario 7 — Dashboard complet : vue 3 nœuds simultanément

**Ce que ça prouve :** La plateforme est opérationnelle, les métriques temps réel sont accessibles sur chaque nœud, l'interface est fonctionnelle.

### Disposition recommandée pour capture

Ouvrir **en parallèle** sur 3 écrans ou en mosaïque :

| Fenêtre | URL | Nœud |
|---------|-----|------|
| Navigateur 1 | `https://localhost/` | Win11 |
| Navigateur 2 | `https://192.168.200.130/` (depuis Win11 + cert) | Ubuntu |
| Navigateur 3 | `https://192.168.200.128/` (depuis Win11 + cert) | Kali |

**Points à faire apparaître dans chaque dashboard :**
- Section "Syncthing" : pairs connectés = 2/2
- Section "Fichiers synchronisés" : liste des `.parquet`
- Section "Statut Backend" : `operational`
- Syncthing GUI (`http://192.168.200.130:8384`) : progression 100%

### Captures à prendre

| # | Quoi capturer | Nom fichier |
|---|---------------|------------|
| 7a | Dashboard Win11 — vue complète | `test7_dashboard_win11_full.png` |
| 7b | Dashboard Ubuntu — vue complète | `test7_dashboard_ubuntu_full.png` |
| 7c | Dashboard Kali — vue complète | `test7_dashboard_kali_full.png` |
| 7d | Syncthing GUI Win11 — 2 pairs connectés | `test7_syncthing_gui_win11.png` |
| 7e | Syncthing GUI Ubuntu — 2 pairs connectés | `test7_syncthing_gui_ubuntu.png` |
| 7f | Capture d'écran mosaïque 3 dashboards simultanés | `test7_cluster_overview.png` |

---

## Récapitulatif — Ordre de passage recommandé pour le jury

| Ordre | Scénario | Durée | Impact |
|-------|----------|-------|--------|
| 1 | Health check — 3 nœuds opérationnels | 2 min | Architecture distribuée visible |
| 2 | Dashboard mosaïque — vue cluster | 1 min | Vue d'ensemble immédiate |
| 3 | **Réplication P2P Win11 → VMs** | 3 min | **Preuve clé du système** |
| 4 | Ingestion multi-nœuds + requête globale DuckDB | 3 min | Consolidation distribuée |
| 5 | Sécurité mTLS — accès refusé vs autorisé | 2 min | Sécurité enterprise |
| 6 | Mode hors-ligne → reconnexion + rattrapage | 4 min | Résilience offline-first |
| 7 | Audit trail — hashes SHA-256 | 2 min | Traçabilité cryptographique |

**Durée totale démo live : ~17 minutes**

---

## Checklist avant la démo

```
[ ] docker compose ps → 4 conteneurs healthy sur Win11
[ ] docker compose ps → 4 conteneurs healthy sur Ubuntu
[ ] docker compose ps → 4 conteneurs healthy sur Kali
[ ] Syncthing GUI Win11 (http://localhost:8384) → 2 pairs connectés, 100%
[ ] bash scripts/setup-syncthing-key.sh → exécuté sur chaque nœud
[ ] https://localhost/ accessible depuis Chrome sur Win11 (cert client installé)
[ ] Certificats CA importés dans les navigateurs des 3 nœuds
[ ] data/shared_storage/ visible et synchronisé sur les 3 nœuds
[ ] Dossier docs/rapport/screenshots/ prêt pour les captures
```

---

*Tests de démonstration jury — SDA-Prototype v0.1 — EIGSI × AL BARAA CONSULTING — 2026*

# Guide de Démonstration Graphique — SDA-Prototype

**Cluster :**
- Node 1 — Win11 `192.168.200.1` · PC physique (hôte VMware)
- Node 2 — Ubuntu `192.168.200.130` · VM VMware
- Node 3 — Kali `192.168.200.128` · VM VMware

**Prérequis :**
- Les 3 nœuds sont démarrés (`docker compose up -d`)
- Le certificat client `sda-client.p12` est importé dans Chrome/Firefox sur chaque nœud
- Syncthing synchronisé à 100% sur les 3 nœuds

**Interfaces graphiques utilisées :**

| Interface | URL | Quoi on y voit |
|-----------|-----|----------------|
| **Dashboard SDA** | `https://localhost/` | État du backend, fichiers, ingestion |
| **Syncthing GUI** | `http://localhost:8384` | Pairs connectés, progression sync, conflits |
| **Swagger UI** | `https://localhost/docs` | API interactive avec résultats JSON |

---

## SCÉNARIO 1 — Vue d'ensemble : cluster opérationnel (3 nœuds)

**Message au jury :** *"Chaque nœud est autonome. Voici les 3 nœuds actifs simultanément."*

### Ce qu'on fait

**Sur Win11 :** Ouvrir 3 onglets côte à côte dans Chrome :

| Onglet | URL |
|--------|-----|
| Onglet 1 | `https://localhost/` |
| Onglet 2 | `https://192.168.200.130/` |
| Onglet 3 | `https://192.168.200.128/` |

> Chrome utilisera automatiquement le certificat client importé.

**Sur chaque nœud (Ubuntu + Kali) :** Ouvrir `https://localhost/` dans leur propre navigateur.

### Ce qu'on montre

- Les 3 dashboards affichent `"status": operational`
- Les 3 dashboards affichent `"offline_ready": true`
- Chaque nœud a son propre compteur de fichiers Parquet locaux

### Captures à prendre

| # | Ce qu'on capture | Nom fichier |
|---|-----------------|------------|
| 1a | Dashboard Win11 — statut "operational" visible | `s1_dashboard_win11.png` |
| 1b | Dashboard Ubuntu — statut "operational" visible | `s1_dashboard_ubuntu.png` |
| 1c | Dashboard Kali — statut "operational" visible | `s1_dashboard_kali.png` |
| 1d | **Mosaïque : 3 dashboards ouverts simultanément** | `s1_mosaic_3nodes.png` |

---

## SCÉNARIO 2 — Réplication P2P en temps réel

**Message au jury :** *"Une donnée injectée sur Win11 apparaît automatiquement sur Ubuntu et Kali en moins de 30 secondes — sans aucune action manuelle."*

### Préparation (avant la démo)

Sur Win11 : ouvrir **Syncthing GUI** dans un 2e écran ou onglet → `http://localhost:8384`

Sur Ubuntu (dans VMware) : ouvrir `http://localhost:8384`

Sur Kali (dans VMware) : ouvrir `http://localhost:8384`

### Ce qu'on fait — étape par étape

**Étape 1 — Montrer l'état initial**

Sur Win11 Syncthing GUI :
- Section **"sda-shared"** → noter le nombre de fichiers affiché (ex: "16 fichiers, 48 KiB")
- Les 2 pairs Ubuntu et Kali sont en vert "À jour"

→ **Capturer `s2_before_syncthing_win11.png`**

**Étape 2 — Injecter des données via Swagger UI**

Sur Win11, ouvrir : `https://localhost/docs`

1. Cliquer sur `POST /api/v1/data/ingest` → **"Try it out"**
2. Saisir le body :
```json
{
  "tenant_id": "demo_replication",
  "data": {
    "source": "node1_win11",
    "message": "Test réplication P2P en direct",
    "temperature": 23.5,
    "capteur_id": "SENSOR-001",
    "timestamp": "2026-05-27T14:30:00Z"
  }
}
```
3. Cliquer **"Execute"**
4. Observer la réponse : `"status": "success"`, `audit_id`, `record_hash`

→ **Capturer `s2_swagger_ingest_win11.png`** (la réponse JSON visible)

**Étape 3 — Observer la réplication**

Rester sur Win11 Syncthing GUI et regarder :
- La barre de progression passe brièvement à "En cours de synchronisation…"
- Revient à "À jour" avec **+1 fichier** (ou fichier mis à jour)

→ **Capturer `s2_syncthing_syncing_win11.png`** (pendant ou juste après la sync)

**Étape 4 — Vérifier sur Ubuntu**

Sur Ubuntu Syncthing GUI (`http://localhost:8384`) :
- Le dossier "sda-shared" affiche le même nombre de fichiers que Win11
- Le fichier `demo_replication_storage.parquet` apparaît dans `data/shared_storage/`

Sur Ubuntu Dashboard (`https://localhost/`) :
- La liste des fichiers synchronisés inclut maintenant `demo_replication_storage.parquet`

→ **Capturer `s2_replicated_ubuntu_syncthing.png`**
→ **Capturer `s2_replicated_ubuntu_dashboard.png`**

**Étape 5 — Vérifier sur Kali (idem)**

→ **Capturer `s2_replicated_kali_dashboard.png`**

### Captures récapitulatives

| # | Ce qu'on capture | Nom fichier |
|---|-----------------|------------|
| 2a | Syncthing Win11 — état initial (X fichiers, À jour) | `s2_before_syncthing_win11.png` |
| 2b | Swagger UI — body d'injection + réponse JSON `record_hash` | `s2_swagger_ingest_win11.png` |
| 2c | Syncthing Win11 — "En cours de synchronisation" ou "+1 fichier" | `s2_syncthing_syncing_win11.png` |
| 2d | Syncthing Ubuntu — fichier apparu, "À jour" | `s2_replicated_ubuntu_syncthing.png` |
| 2e | Dashboard Ubuntu — fichier `demo_replication` dans la liste | `s2_replicated_ubuntu_dashboard.png` |
| 2f | Dashboard Kali — même fichier présent | `s2_replicated_kali_dashboard.png` |

---

## SCÉNARIO 3 — Nœud hors-service : tolérance aux pannes

**Message au jury :** *"Que se passe-t-il si un nœud tombe ? Les deux autres continuent de fonctionner normalement. À la reconnexion, le nœud manquant se synchronise automatiquement."*

### Ce qu'on fait — étape par étape

**Étape 1 — Montrer le cluster complet (état initial)**

Sur Win11 Syncthing GUI :
- Les 2 pairs (Ubuntu + Kali) sont en vert "À jour"

→ **Capturer `s3_before_all_connected.png`**

**Étape 2 — Mettre Ubuntu hors service**

Sur la VM Ubuntu dans VMware :
- Fermer la fenêtre VMware de Ubuntu **OU** dans VMware Player → **Suspend** (mettre en pause)

Attendre 10–15 secondes.

Sur Win11 Syncthing GUI :
- Ubuntu passe en **rouge/orange** → "Déconnecté" ou "Hors ligne"
- Kali reste vert "À jour"

→ **Capturer `s3_ubuntu_offline_syncthing.png`** ← moment clé !

**Étape 3 — Continuer à travailler : injecter des données sur Win11 et Kali**

Sur Win11 Swagger (`https://localhost/docs`) → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "test_resilience_w11",
  "data": {
    "source": "node1_win11",
    "message": "Donnée injectée pendant panne Ubuntu",
    "valeur": 99,
    "timestamp": "2026-05-27T15:00:00Z"
  }
}
```
→ **Capturer `s3_ingest_win11_while_ubuntu_offline.png`** (succès malgré la panne)

Sur Kali Swagger (`https://localhost/docs`) → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "test_resilience_kali",
  "data": {
    "source": "node3_kali",
    "message": "Kali continue de fonctionner",
    "valeur": 77
  }
}
```
→ **Capturer `s3_ingest_kali_while_ubuntu_offline.png`**

**Étape 4 — Montrer qu'Ubuntu n'a pas encore ces fichiers (avant reconnexion)**

Sur Ubuntu Syncthing GUI (si encore visible) :
- La section du dossier "sda-shared" montre que la sync est en attente

→ **Capturer `s3_ubuntu_missing_files.png`** (si possible)

**Étape 5 — Reconnecter Ubuntu**

Dans VMware : **Reprendre** la VM Ubuntu (Resume).

Attendre 15–30 secondes.

Sur Win11 Syncthing GUI :
- Ubuntu repasse en vert "À jour"
- Le compteur de fichiers synchronisés augmente

→ **Capturer `s3_ubuntu_reconnected_syncing.png`** (pendant la sync)
→ **Capturer `s3_ubuntu_back_in_sync.png`** (après, "À jour")

**Étape 6 — Vérifier sur Ubuntu que les données sont bien arrivées**

Sur Ubuntu Dashboard (`https://localhost/`) :
- Les fichiers `test_resilience_w11_storage.parquet` et `test_resilience_kali_storage.parquet` sont maintenant présents

→ **Capturer `s3_ubuntu_dashboard_recovered.png`**

### Captures récapitulatives

| # | Ce qu'on capture | Nom fichier |
|---|-----------------|------------|
| 3a | Syncthing Win11 — tous connectés (état initial) | `s3_before_all_connected.png` |
| 3b | **Syncthing Win11 — Ubuntu en rouge "Déconnecté"** | `s3_ubuntu_offline_syncthing.png` |
| 3c | Swagger Win11 — ingestion réussie malgré la panne | `s3_ingest_win11_while_ubuntu_offline.png` |
| 3d | Swagger Kali — ingestion réussie (Kali toujours actif) | `s3_ingest_kali_while_ubuntu_offline.png` |
| 3e | Syncthing Win11 — Ubuntu reconnecté, sync en cours | `s3_ubuntu_reconnected_syncing.png` |
| 3f | Syncthing Win11 — retour à "À jour" | `s3_ubuntu_back_in_sync.png` |
| 3g | Dashboard Ubuntu — fichiers récupérés après reconnexion | `s3_ubuntu_dashboard_recovered.png` |

---

## SCÉNARIO 4 — Sécurité mTLS : qui peut accéder ?

**Message au jury :** *"L'accès à l'API est protégé par authentification mutuelle TLS. Sans certificat client valide, l'accès est refusé."*

### Ce qu'on fait — étape par étape

**Test A — Accès refusé dans Firefox (mode privé sans certificat)**

1. Ouvrir Firefox en mode navigation **privée** (Ctrl+Maj+P)
2. Taper : `https://localhost/`
3. Firefox demande si on veut choisir un certificat → cliquer **"Annuler"** (ne pas en fournir)
4. La page affiche `400 — No required SSL certificate was sent`

→ **Capturer `s4_rejected_no_cert.png`** ← accès refusé visible

**Test B — Accès autorisé dans Chrome (avec certificat)**

1. Ouvrir Chrome normalement
2. Taper : `https://localhost/`
3. Chrome affiche une popup "Sélectionner un certificat" → choisir `sda-client-node-1`
4. Le dashboard SDA s'affiche normalement

→ **Capturer `s4_accepted_with_cert.png`**

**Test C — Afficher les détails de sécurité dans Chrome**

1. Sur Chrome avec le dashboard ouvert : cliquer sur le **cadenas** dans la barre d'adresse
2. Cliquer sur **"La connexion est sécurisée"**
3. Cliquer sur **"Le certificat est valide"**
4. Afficher : `CN = sda-client-node-1`, émis par `SDA Internal CA`, TLS 1.3

→ **Capturer `s4_chrome_padlock.png`**
→ **Capturer `s4_chrome_cert_details.png`** (détails du certificat)

**Test D — Montrer Nginx reject dans Swagger (optionnel)**

1. Ouvrir `https://localhost/docs` en **mode privé** Firefox (sans cert)
2. La page ne charge pas → `400 Bad Request`

→ **Capturer `s4_swagger_rejected.png`**

### Captures récapitulatives

| # | Ce qu'on capture | Nom fichier |
|---|-----------------|------------|
| 4a | Firefox mode privé → `400 No required SSL certificate` | `s4_rejected_no_cert.png` |
| 4b | Chrome avec cert → dashboard accessible | `s4_accepted_with_cert.png` |
| 4c | Chrome cadenas → "Connexion sécurisée" | `s4_chrome_padlock.png` |
| 4d | Chrome → détails certificat client CN + CA | `s4_chrome_cert_details.png` |

---

## SCÉNARIO 5 — Mode hors-ligne total : nœud isolé

**Message au jury :** *"Un nœud déconnecté d'internet et du réseau local reste 100% opérationnel. Les données sont capturées localement et rattrapées à la reconnexion."*

### Ce qu'on fait — étape par étape

**Étape 1 — Isoler complètement Kali (simuler coupure réseau)**

Dans VMware Player, sélectionner la VM Kali :
- Menu **VM → Settings → Network Adapter**
- Décocher **"Connected"** (ou passer en "Host-only" déconnecté)

→ Kali n'a plus accès au réseau VMnet1.

Sur Win11 Syncthing GUI → Kali passe en rouge "Déconnecté"

→ **Capturer `s5_kali_offline_syncthing.png`**

**Étape 2 — Injecter des données sur Kali (hors-ligne)**

Sur la VM Kali, ouvrir `https://localhost/docs` :
- Le dashboard local fonctionne toujours parfaitement (local-first !)
- `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "kali_offline_data",
  "data": {
    "source": "node3_kali",
    "message": "Donnée créée en mode hors-ligne",
    "capteur": "TEMP-003",
    "valeur": 36.6,
    "timestamp": "2026-05-27T16:00:00Z"
  }
}
```
→ **Capturer `s5_kali_ingest_offline.png`** — l'injection réussit même sans réseau !

**Étape 3 — Vérifier que Win11 n'a pas encore la donnée**

Sur Win11 Syncthing GUI : Kali est toujours rouge, fichier absent

→ **Capturer `s5_win11_no_kali_data.png`**

**Étape 4 — Reconnecter Kali**

Dans VMware : re-cocher **"Connected"** sur l'adaptateur réseau de Kali.

Sur Win11 Syncthing GUI :
- Kali repasse en vert "À jour" (sync automatique)
- Le fichier `kali_offline_data_storage.parquet` se propage vers Win11 et Ubuntu

→ **Capturer `s5_kali_reconnected.png`** (pendant la sync)
→ **Capturer `s5_win11_kali_data_arrived.png`** (fichier apparu sur Win11)

**Étape 5 — Vérifier sur Ubuntu que Kali est de nouveau sync**

Sur Ubuntu Syncthing GUI :
- Kali passe de "Déconnecté" à "À jour"
- Fichier `kali_offline_data_storage.parquet` visible

→ **Capturer `s5_ubuntu_kali_synced.png`**

### Captures récapitulatives

| # | Ce qu'on capture | Nom fichier |
|---|-----------------|------------|
| 5a | Syncthing Win11 — Kali en rouge "Déconnecté" | `s5_kali_offline_syncthing.png` |
| 5b | Dashboard Kali — ingestion réussie hors-ligne | `s5_kali_ingest_offline.png` |
| 5c | Syncthing Win11 — fichier Kali absent | `s5_win11_no_kali_data.png` |
| 5d | Syncthing Win11 — Kali reconnecté, sync en cours | `s5_kali_reconnected.png` |
| 5e | Syncthing Win11 — fichier Kali arrivé, "À jour" | `s5_win11_kali_data_arrived.png` |
| 5f | Dashboard Ubuntu — donnée Kali propagée | `s5_ubuntu_kali_synced.png` |

---

## SCÉNARIO 6 — Consolidation analytique multi-nœuds (Swagger)

**Message au jury :** *"Depuis n'importe quel nœud, on peut interroger les données de TOUT le cluster — sans serveur central."*

### Ce qu'on fait — étape par étape

**Sur Win11 Swagger (`https://localhost/docs`) :**

1. Cliquer sur `GET /api/v1/node/info` → **"Try it out"** → **"Execute"**
   - Affiche : ID Syncthing, nombre de fichiers synchronisés, tenants connus
→ **Capturer `s6_node_info_win11.png`**

2. Cliquer sur `GET /health` → **"Execute"**
   - Affiche : `"offline_ready": true`, `"central_dependency": "none"`
→ **Capturer `s6_health_win11.png`**

3. Cliquer sur `POST /api/v1/sync/reconcile` → **"Execute"** (body vide)
   - Affiche : `{"status": "no_conflicts", "conflicts_resolved": 0}`
→ **Capturer `s6_reconcile_win11.png`**

**Même chose sur Ubuntu et Kali :**

Ouvrir `https://localhost/docs` sur chaque nœud :
- `GET /api/v1/node/info` → montrer que les IDs Syncthing sont différents (nœuds distincts)

→ **Capturer `s6_node_info_ubuntu.png`**
→ **Capturer `s6_node_info_kali.png`**

**Comparaison côte à côte :**
- Ouvrir 3 fenêtres Swagger simultanément sur Win11 :
  - `https://localhost/docs`
  - `https://192.168.200.130/docs`
  - `https://192.168.200.128/docs`
- Exécuter `GET /api/v1/node/info` sur chacun → montrer les 3 IDs distincts

→ **Capturer `s6_swagger_3nodes_mosaic.png`**

### Captures récapitulatives

| # | Ce qu'on capture | Nom fichier |
|---|-----------------|------------|
| 6a | Swagger Win11 — `/node/info` avec ID Syncthing | `s6_node_info_win11.png` |
| 6b | Swagger Win11 — `/health` `offline_ready: true` | `s6_health_win11.png` |
| 6c | Swagger Win11 — `/reconcile` `no_conflicts` | `s6_reconcile_win11.png` |
| 6d | Swagger Ubuntu — `/node/info` (ID différent) | `s6_node_info_ubuntu.png` |
| 6e | Swagger Kali — `/node/info` (ID différent) | `s6_node_info_kali.png` |
| 6f | **Mosaïque 3 Swagger — 3 IDs distincts simultanément** | `s6_swagger_3nodes_mosaic.png` |

---

## SCÉNARIO 7 — Vue finale : cluster complet opérationnel

**Message au jury :** *"Synthèse : les 3 nœuds, Syncthing, les dashboards — tout en même temps."*

### Disposition recommandée (Win11 avec 2 écrans ou grande résolution)

**Écran principal :**
- Chrome : `https://localhost/` (dashboard Win11)
- Chrome onglet 2 : `https://192.168.200.130/` (dashboard Ubuntu via Win11)
- Chrome onglet 3 : `https://192.168.200.128/` (dashboard Kali via Win11)

**Écran secondaire (ou onglets) :**
- Syncthing Win11 : `http://localhost:8384` — 2 pairs connectés, 100%
- VMware Player — fenêtres Ubuntu et Kali visibles avec leur propre dashboard

### Ce qu'on montre

Dans Syncthing GUI Win11 :
- **2 pairs connectés** : Ubuntu ✅ Kali ✅
- Dossier "sda-shared" : "N fichiers, X KiB — À jour"
- Dernière synchronisation : il y a quelques secondes

Dans chaque dashboard SDA :
- `status: operational`
- `offline_ready: true`
- Même liste de fichiers Parquet sur les 3 nœuds (preuve de cohérence)

### Captures finales

| # | Ce qu'on capture | Nom fichier |
|---|-----------------|------------|
| 7a | Syncthing Win11 — 2 pairs verts + statistiques sync | `s7_syncthing_win11_final.png` |
| 7b | Syncthing Ubuntu — 2 pairs verts + Win11 + Kali | `s7_syncthing_ubuntu_final.png` |
| 7c | Dashboard Win11 complet | `s7_dashboard_win11_final.png` |
| 7d | Dashboard Ubuntu complet | `s7_dashboard_ubuntu_final.png` |
| 7e | Dashboard Kali complet | `s7_dashboard_kali_final.png` |
| 7f | **Photo finale : mosaïque des 3 dashboards + Syncthing** | `s7_cluster_final_mosaic.png` |

---

## Ordre de passage recommandé (17 minutes)

| Ordre | Scénario | Durée | Message clé |
|-------|----------|-------|-------------|
| 1 | **Vue d'ensemble** — 3 dashboards ouverts simultanément | 2 min | Architecture distribuée |
| 2 | **Réplication P2P** — injection Win11 → apparition Ubuntu + Kali | 3 min | Le cœur du système |
| 3 | **Sécurité mTLS** — refus Firefox vs accès Chrome | 2 min | Sécurité enterprise |
| 4 | **Nœud hors-service** — Ubuntu suspendu, travail continue | 4 min | Tolérance aux pannes |
| 5 | **Mode hors-ligne** — Kali sans réseau, injection locale, rattrapage | 3 min | Offline-first réel |
| 6 | **API / Swagger** — node_info, reconcile, health sur 3 nœuds | 2 min | Consolidation distribuée |
| 7 | **Vue finale** — mosaïque cluster complet | 1 min | Synthèse visuelle |

---

## Checklist pré-démo (à vérifier 30 min avant)

```
Nœuds :
[ ] docker compose ps sur Win11  → 4 services healthy
[ ] docker compose ps sur Ubuntu → 4 services healthy
[ ] docker compose ps sur Kali   → 4 services healthy

Syncthing :
[ ] http://localhost:8384 sur Win11  → 2 pairs connectés, "À jour"
[ ] http://localhost:8384 sur Ubuntu → 2 pairs connectés, "À jour"
[ ] http://localhost:8384 sur Kali   → 2 pairs connectés, "À jour"

Navigateurs :
[ ] Certificat sda-client.p12 importé dans Chrome (Win11, Ubuntu, Kali)
[ ] https://localhost/ s'ouvre sans erreur sur les 3 nœuds
[ ] https://localhost/docs accessible (Swagger UI)

Données :
[ ] Au moins 10 fichiers .parquet dans data/shared_storage/ sur chaque nœud
[ ] Aucun fichier en état "conflit" dans Syncthing
```

---

*Guide démonstration graphique — SDA-Prototype v0.1 — EIGSI × AL BARAA CONSULTING — 2026*

# Guide de Démonstration Graphique — SDA-Prototype

---

## Architecture — Ce qu'il faut comprendre avant la démo

```
┌─────────────────────────────────────────────────────────────────┐
│           ARCHITECTURE P2P SYMÉTRIQUE — AUCUN SERVEUR CENTRAL   │
│                                                                 │
│   Win11 (192.168.200.1)      Ubuntu (192.168.200.130)           │
│   ┌──────────────────┐       ┌──────────────────┐              │
│   │ nginx (443)      │       │ nginx (443)      │              │
│   │ backend (8000)   │       │ backend (8000)   │              │
│   │ frontend (3000)  │       │ frontend (3000)  │              │
│   │ syncthing (22000)│◄─────►│ syncthing (22000)│             │
│   └──────────────────┘       └──────────────────┘              │
│           ▲                          ▲                          │
│           │                          │                          │
│           └──────────┐   ┌───────────┘                         │
│               Kali (192.168.200.128)                            │
│               ┌──────────────────┐                             │
│               │ nginx (443)      │                             │
│               │ backend (8000)   │                             │
│               │ frontend (3000)  │                             │
│               │ syncthing (22000)│                             │
│               └──────────────────┘                             │
│                                                                 │
│  Chaque nœud est IDENTIQUE et AUTONOME.                        │
│  Syncthing réplique les fichiers Parquet entre TOUS les pairs. │
│  Aucun nœud ne coordonne les autres.                           │
└─────────────────────────────────────────────────────────────────┘
```

**Règle fondamentale de cette démo :**
> Chaque nœud est montré **sur son propre écran**, avec son propre navigateur ouvert sur `https://localhost/`. On ne pilote jamais un nœud depuis un autre. La communication inter-nœuds se fait **uniquement via Syncthing** (partage de fichiers P2P), jamais via les APIs.

**Prérequis :**
- Les 3 nœuds : `docker compose up -d` exécuté sur chacun
- Certificat `sda-client.p12` importé dans Chrome **sur chaque nœud**
- Syncthing : 100% synchronisé sur les 3 nœuds

**Interfaces disponibles sur chaque nœud (accès local uniquement) :**

| Interface | URL | Contenu |
|-----------|-----|---------|
| **Dashboard SDA** | `https://localhost/` | État, fichiers Parquet locaux, métriques |
| **Syncthing GUI** | `http://localhost:8384` | Pairs connectés, progression sync |
| **Swagger UI** | `https://localhost/docs` | API interactive, résultats JSON |

---

## SCÉNARIO 1 — Chaque nœud est autonome et opérationnel

**Message au jury :** *"Il n'y a pas de serveur central. Chaque machine est un SDA complet et indépendant. Voici les 3 nœuds actifs — chacun montré sur son propre écran."*

### Ce qu'on montre

**Disposition physique (3 écrans ou Alt+Tab entre VMware) :**

| Écran | Machine | URL ouverte |
|-------|---------|-------------|
| Écran principal | Win11 (PC physique) | `https://localhost/` |
| Fenêtre VMware 1 | Ubuntu | `https://localhost/` ← son propre navigateur |
| Fenêtre VMware 2 | Kali | `https://localhost/` ← son propre navigateur |

> Chaque nœud accède à **son propre backend local** — jamais à celui d'un autre.

### Ce qu'on fait

Sur **chaque nœud indépendamment** :
1. Ouvrir Chrome → `https://localhost/`
2. Le dashboard SDA s'affiche avec :
   - `"status": operational`
   - `"offline_ready": true`
   - `"central_dependency": none`
   - La liste des fichiers Parquet locaux

3. Ouvrir `https://localhost/docs` (Swagger) → `GET /health` → **Execute**
   - Réponse identique sur les 3 nœuds mais chaque instance est indépendante

### Captures à prendre

| # | Ce qu'on capture | Sur quel nœud | Nom fichier |
|---|-----------------|---------------|------------|
| 1a | Dashboard `https://localhost/` — `offline_ready: true` | Win11 | `s1_dashboard_win11.png` |
| 1b | Dashboard `https://localhost/` — `offline_ready: true` | Ubuntu (fenêtre VMware) | `s1_dashboard_ubuntu.png` |
| 1c | Dashboard `https://localhost/` — `offline_ready: true` | Kali (fenêtre VMware) | `s1_dashboard_kali.png` |
| 1d | **Mosaïque : 3 fenêtres VMware côte à côte, chacune sur son `localhost`** | Photo d'écran globale | `s1_mosaic_3nodes.png` |

---

## SCÉNARIO 2 — Réplication P2P : une donnée injectée sur Win11 arrive sur Ubuntu et Kali

**Message au jury :** *"Je vais injecter une donnée sur Win11. Elle est stockée localement dans la base DuckDB de Win11, exportée en fichier Parquet, puis Syncthing la réplique automatiquement vers Ubuntu et Kali — sans qu'aucun nœud ne soit le serveur."*

### Ce qu'on fait — étape par étape

**Étape 1 — État initial sur les 3 nœuds**

Sur **Win11** → `http://localhost:8384` (Syncthing GUI) :
- Les 2 pairs Ubuntu et Kali sont en **vert "À jour"**
- Noter le nombre de fichiers dans "sda-shared" (ex : "16 fichiers")

Sur **Ubuntu** → `http://localhost:8384` :
- Pareil — voir les 2 pairs Win11 et Kali en vert

→ **Capturer `s2_syncthing_initial_win11.png`** et **`s2_syncthing_initial_ubuntu.png`**

**Étape 2 — Injection sur Win11 uniquement (via Swagger local)**

Sur **Win11** → `https://localhost/docs` :

1. Cliquer `POST /api/v1/data/ingest` → **"Try it out"**
2. Saisir :
```json
{
  "tenant_id": "sda_demo",
  "data": {
    "source": "node1_win11",
    "type": "temperature",
    "capteur": "SENSOR-W11-001",
    "valeur_celsius": 23.5,
    "site": "Datacenter-A",
    "timestamp": "2026-05-27T14:30:00Z"
  }
}
```
3. Cliquer **"Execute"**
4. Réponse : `"status": "success"` + `record_hash` SHA-256 + `audit_id`

→ **Capturer `s2_swagger_ingest_win11.png`** (réponse JSON visible avec `record_hash`)

*Ce qui se passe en coulisse (invisible mais réel) :*
- Win11 écrit dans sa DuckDB locale → exporte `sda_demo_storage.parquet` dans `data/shared_storage/`
- Syncthing détecte le nouveau fichier → le réplique vers Ubuntu et Kali via BEP/TLS 1.3

**Étape 3 — Observer la propagation (sans rien faire)**

Attendre **15–30 secondes**, puis sur **Ubuntu** → `http://localhost:8384` :
- La barre de progression passe brièvement à "En cours…"
- Revient à "À jour" avec `+1 fichier`

→ **Capturer `s2_syncthing_ubuntu_synced.png`** (fichier arrivé, "À jour")

Sur **Kali** → `http://localhost:8384` :
- Même observation

→ **Capturer `s2_syncthing_kali_synced.png`**

**Étape 4 — Vérifier le contenu sur Ubuntu (depuis Ubuntu lui-même)**

Sur **Ubuntu** → `https://localhost/docs` :

1. `GET /api/v1/node/info` → **Execute** : montre que c'est bien le nœud Ubuntu (hostname différent)
2. Dashboard `https://localhost/` : le fichier `sda_demo_storage.parquet` apparaît dans la liste locale

→ **Capturer `s2_dashboard_ubuntu_file_appeared.png`**

### Captures récapitulatives

| # | Ce qu'on capture | Sur quel nœud | Nom fichier |
|---|-----------------|---------------|------------|
| 2a | Syncthing initial — 2 pairs verts | Win11 | `s2_syncthing_initial_win11.png` |
| 2b | Swagger — injection + réponse `record_hash` | Win11 | `s2_swagger_ingest_win11.png` |
| 2c | Syncthing Ubuntu — fichier arrivé "À jour" | Ubuntu | `s2_syncthing_ubuntu_synced.png` |
| 2d | Syncthing Kali — fichier arrivé "À jour" | Kali | `s2_syncthing_kali_synced.png` |
| 2e | Dashboard Ubuntu — fichier `sda_demo` dans la liste | Ubuntu | `s2_dashboard_ubuntu_file_appeared.png` |

---

## SCÉNARIO 3 — Tolérance aux pannes : un nœud tombe, les autres continuent

**Message au jury :** *"Aucun nœud n'est indispensable. Si Ubuntu tombe, Win11 et Kali continuent de fonctionner normalement et de se synchroniser entre eux. À la reconnexion, Ubuntu rattrape tout ce qu'il a manqué automatiquement."*

### Ce qu'on fait — étape par étape

**Étape 1 — Montrer le cluster complet**

Sur **Win11** Syncthing GUI : Ubuntu ✅ Kali ✅ — tous en vert "À jour"
→ **Capturer `s3_all_connected_win11.png`**

**Étape 2 — Mettre Ubuntu hors service**

Dans VMware Player : sélectionner la VM Ubuntu → **Suspend** (mettre en pause)

Attendre 10 secondes.

Sur **Win11** Syncthing GUI :
- Ubuntu passe en **rouge/orange** : "Déconnecté"
- Kali reste **vert** : "À jour" (non affecté)

Sur **Kali** Syncthing GUI :
- Ubuntu apparaît aussi comme "Déconnecté"
- Win11 reste vert

→ **Capturer `s3_ubuntu_offline_win11.png`** ← nœud rouge visible
→ **Capturer `s3_ubuntu_offline_kali.png`** ← même observation depuis Kali

**Étape 3 — Win11 et Kali continuent de travailler normalement**

Sur **Win11** → `https://localhost/docs` → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "resilience_win11",
  "data": {
    "source": "node1_win11",
    "message": "Win11 opérationnel malgré la panne Ubuntu",
    "capteur": "SENSOR-W11-002",
    "valeur": 42.0
  }
}
```
→ **Capturer `s3_win11_works_without_ubuntu.png`** (succès malgré la panne)

Sur **Kali** → `https://localhost/docs` → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "resilience_kali",
  "data": {
    "source": "node3_kali",
    "message": "Kali opérationnel malgré la panne Ubuntu",
    "valeur": 77.7
  }
}
```
→ **Capturer `s3_kali_works_without_ubuntu.png`**

**Étape 4 — Win11 et Kali se synchronisent entre eux (sans Ubuntu)**

Sur **Win11** Syncthing GUI : Kali est toujours vert, la sync Win11↔Kali continue normalement.
→ **Capturer `s3_win11_kali_sync_continues.png`** (2 nœuds actifs se synchronisent)

**Étape 5 — Reconnecter Ubuntu**

Dans VMware : **Resume** la VM Ubuntu.

Sur **Win11** Syncthing GUI (attendre 15–30 s) :
- Ubuntu repasse en **vert** "À jour"
- Les fichiers `resilience_win11` et `resilience_kali` se propagent vers Ubuntu

→ **Capturer `s3_ubuntu_reconnected_syncing.png`** (pendant la sync)
→ **Capturer `s3_ubuntu_back_online.png`** (retour à "À jour")

Sur **Ubuntu** (après reconnexion) → `https://localhost/` :
- Les fichiers manqués (`resilience_win11`, `resilience_kali`) sont maintenant présents

→ **Capturer `s3_ubuntu_recovered_dashboard.png`**

### Captures récapitulatives

| # | Ce qu'on capture | Sur quel nœud | Nom fichier |
|---|-----------------|---------------|------------|
| 3a | Syncthing — tous connectés (état initial) | Win11 | `s3_all_connected_win11.png` |
| 3b | **Syncthing — Ubuntu rouge "Déconnecté"** | Win11 | `s3_ubuntu_offline_win11.png` |
| 3c | Syncthing — Ubuntu rouge (même vue) | Kali | `s3_ubuntu_offline_kali.png` |
| 3d | Swagger — ingestion réussie sans Ubuntu | Win11 | `s3_win11_works_without_ubuntu.png` |
| 3e | Swagger — ingestion réussie sans Ubuntu | Kali | `s3_kali_works_without_ubuntu.png` |
| 3f | Syncthing — Win11↔Kali se synchronisent | Win11 | `s3_win11_kali_sync_continues.png` |
| 3g | Syncthing — Ubuntu de retour "À jour" | Win11 | `s3_ubuntu_back_online.png` |
| 3h | Dashboard Ubuntu — données rattrapées | Ubuntu | `s3_ubuntu_recovered_dashboard.png` |

---

## SCÉNARIO 4 — Mode offline total : Kali isolé du réseau

**Message au jury :** *"Un nœud sans réseau reste 100% opérationnel en local. Les données créées offline sont synchronisées automatiquement dès la reconnexion — c'est le paradigme offline-first."*

### Ce qu'on fait — étape par étape

**Étape 1 — Déconnecter Kali du réseau VMnet1**

Dans VMware Player, sur la VM Kali :
- Menu **VM → Settings → Network Adapter**
- Décocher **"Connected"** (ou basculer sur "Host-only" isolé)

Sur **Win11** Syncthing GUI → Kali passe en rouge "Déconnecté"
Sur **Ubuntu** Syncthing GUI → même observation
→ **Capturer `s4_kali_isolated_win11.png`**

**Étape 2 — Kali fonctionne toujours en local (offline-first)**

Sur **Kali** → `https://localhost/` :
- Le dashboard s'affiche normalement (backend local, pas besoin du réseau)
- `"offline_ready": true` confirmé

Sur **Kali** → `https://localhost/docs` → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "kali_offline",
  "data": {
    "source": "node3_kali",
    "statut": "créé_hors_ligne",
    "capteur": "SENSOR-K03",
    "valeur_pression": 1013.25,
    "timestamp": "2026-05-27T16:00:00Z"
  }
}
```
→ **Capturer `s4_kali_ingest_offline.png`** — injection réussie sans réseau !

**Étape 3 — Vérifier que Win11 n'a pas encore cette donnée**

Sur **Win11** Syncthing GUI : Kali toujours rouge, fichier `kali_offline` absent.
→ **Capturer `s4_win11_no_kali_data.png`**

**Étape 4 — Reconnecter Kali**

Dans VMware : re-cocher **"Connected"** sur l'adaptateur réseau de Kali.

Sur **Win11** Syncthing GUI (attendre 15–30 s) :
- Kali repasse en **vert**
- Le fichier `kali_offline_storage.parquet` se propage vers Win11 et Ubuntu

→ **Capturer `s4_kali_reconnected.png`**
→ **Capturer `s4_win11_kali_data_arrived.png`** (fichier arrivé automatiquement)

### Captures récapitulatives

| # | Ce qu'on capture | Sur quel nœud | Nom fichier |
|---|-----------------|---------------|------------|
| 4a | Syncthing — Kali rouge "Déconnecté" | Win11 | `s4_kali_isolated_win11.png` |
| 4b | Dashboard Kali — opérationnel hors-ligne | Kali | `s4_kali_dashboard_offline.png` |
| 4c | Swagger Kali — injection réussie hors-ligne | Kali | `s4_kali_ingest_offline.png` |
| 4d | Syncthing Win11 — fichier Kali absent | Win11 | `s4_win11_no_kali_data.png` |
| 4e | Syncthing Win11 — Kali reconnecté, sync | Win11 | `s4_kali_reconnected.png` |
| 4f | Dashboard Win11 — donnée Kali arrivée | Win11 | `s4_win11_kali_data_arrived.png` |

---

## SCÉNARIO 5 — Sécurité mTLS : authentification mutuelle

**Message au jury :** *"L'accès à chaque nœud est protégé par TLS mutuel — seul un client avec un certificat signé par notre CA interne peut accéder aux données."*

### Ce qu'on fait — sur chaque nœud indépendamment

**Test A — Accès refusé sans certificat (Firefox mode privé)**

Sur **Win11** :
1. Ouvrir Firefox en navigation privée (Ctrl+Maj+P)
2. Aller sur `https://localhost/`
3. À la demande de certificat → cliquer **"Annuler"**
4. Résultat : `400 No required SSL certificate was sent`

→ **Capturer `s5_rejected_no_cert_win11.png`**

**Test B — Accès autorisé avec certificat (Chrome)**

Sur **Win11** :
1. Ouvrir Chrome normalement → `https://localhost/`
2. Chrome sélectionne automatiquement le certificat `sda-client-node-1`
3. Le dashboard s'affiche

→ **Capturer `s5_accepted_with_cert_win11.png`**

**Test C — Afficher les détails TLS dans Chrome**

1. Cliquer sur le **cadenas** dans la barre d'adresse
2. **"La connexion est sécurisée"** → **"Le certificat est valide"**
3. Détails : `CN = sda-client-node-1`, signé par `SDA Internal CA`, protocole `TLS 1.3`

→ **Capturer `s5_chrome_padlock.png`**
→ **Capturer `s5_chrome_cert_details.png`**

**Test D — Même test sur Ubuntu (son propre certificat)**

Sur **Ubuntu** :
- Même démarche → `https://localhost/`
- Le certificat client est `sda-client-node-2` (distinct de Win11)

→ **Capturer `s5_chrome_cert_ubuntu.png`** (CN différent — nœud distinct)

### Captures récapitulatives

| # | Ce qu'on capture | Sur quel nœud | Nom fichier |
|---|-----------------|---------------|------------|
| 5a | Firefox mode privé → `400 No SSL certificate` | Win11 | `s5_rejected_no_cert_win11.png` |
| 5b | Chrome avec cert → dashboard accessible | Win11 | `s5_accepted_with_cert_win11.png` |
| 5c | Chrome cadenas → "Connexion sécurisée" TLS 1.3 | Win11 | `s5_chrome_padlock.png` |
| 5d | Chrome → détails certificat CN + CA interne | Win11 | `s5_chrome_cert_details.png` |
| 5e | Chrome Ubuntu → CN différent (nœud distinct) | Ubuntu | `s5_chrome_cert_ubuntu.png` |

---

## SCÉNARIO 6 — Ingestion simultanée sur les 3 nœuds

**Message au jury :** *"Chaque nœud peut écrire des données en même temps — il n'y a pas de verrou central, pas de coordination. Syncthing s'occupe de la cohérence des fichiers."*

### Ce qu'on fait — les 3 nœuds en parallèle

Sur **Win11** → `https://localhost/docs` → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "multinode_live",
  "data": { "node": "win11", "valeur": 100, "capteur": "W11-TEMP" }
}
```

Sur **Ubuntu** (simultanément) → `https://localhost/docs` → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "multinode_live",
  "data": { "node": "ubuntu", "valeur": 200, "capteur": "UBU-TEMP" }
}
```

Sur **Kali** (simultanément) → `https://localhost/docs` → `POST /api/v1/data/ingest` :
```json
{
  "tenant_id": "multinode_live",
  "data": { "node": "kali", "valeur": 300, "capteur": "KALI-TEMP" }
}
```

Attendre 30 secondes → Syncthing propage les 3 fichiers.

Sur **chaque nœud** → `http://localhost:8384` : le dossier "sda-shared" affiche le même contenu.

→ **Capturer `s6_syncthing_after_multinode_win11.png`** (tous les fichiers présents)
→ **Capturer `s6_syncthing_after_multinode_ubuntu.png`** (même contenu)
→ **Capturer `s6_syncthing_after_multinode_kali.png`** (même contenu)

### Captures récapitulatives

| # | Ce qu'on capture | Sur quel nœud | Nom fichier |
|---|-----------------|---------------|------------|
| 6a | Swagger Win11 — ingestion `multinode_live` | Win11 | `s6_ingest_win11.png` |
| 6b | Swagger Ubuntu — ingestion `multinode_live` | Ubuntu | `s6_ingest_ubuntu.png` |
| 6c | Swagger Kali — ingestion `multinode_live` | Kali | `s6_ingest_kali.png` |
| 6d | Syncthing Win11 — dossier complet après sync | Win11 | `s6_syncthing_after_multinode_win11.png` |
| 6e | Syncthing Ubuntu — même contenu | Ubuntu | `s6_syncthing_after_multinode_ubuntu.png` |
| 6f | **Mosaïque 3 Syncthing GUI — contenu identique** | Tous | `s6_mosaic_syncthing_3nodes.png` |

---

## Ordre de passage recommandé (18 minutes)

| Ordre | Scénario | Durée | Ce que ça prouve |
|-------|----------|-------|-----------------|
| 1 | **Vue d'ensemble** — 3 `localhost/` simultanément | 2 min | Chaque nœud autonome, aucun serveur central |
| 2 | **Réplication P2P** — Win11 injecte, Ubuntu/Kali reçoivent | 3 min | Sync automatique sans coordination |
| 3 | **Tolérance aux pannes** — Ubuntu suspendu, les 2 autres continuent | 4 min | Résilience P2P |
| 4 | **Mode offline** — Kali isolé, injection locale, rattrapage | 3 min | Offline-first réel |
| 5 | **Sécurité mTLS** — 400 sans cert vs accès avec cert | 2 min | Sécurité enterprise |
| 6 | **Ingestion simultanée** — 3 nœuds injectent en même temps | 3 min | Symétrie P2P sans coordination |
| ★ | **Clôture** — Syncthing GUI mosaïque, même contenu partout | 1 min | Cohérence distribuée |

---

## Checklist pré-démo (30 min avant)

```
Démarrage :
[ ] Win11  : docker compose ps → 4 services healthy
[ ] Ubuntu : docker compose ps → 4 services healthy
[ ] Kali   : docker compose ps → 4 services healthy

Syncthing (sur chaque nœud via http://localhost:8384) :
[ ] Win11  : 2 pairs verts, dossier sda-shared "À jour"
[ ] Ubuntu : 2 pairs verts, dossier sda-shared "À jour"
[ ] Kali   : 2 pairs verts, dossier sda-shared "À jour"

Navigateurs (sur chaque nœud) :
[ ] Win11  : https://localhost/ → dashboard OK (Chrome avec cert)
[ ] Ubuntu : https://localhost/ → dashboard OK (Chrome avec cert)
[ ] Kali   : https://localhost/ → dashboard OK (Chrome avec cert)

Données :
[ ] Au moins 10 fichiers .parquet dans data/shared_storage/ sur chaque nœud
[ ] Aucun fichier en conflit dans Syncthing
```

---

*Guide démonstration graphique — SDA-Prototype v0.1 — Architecture P2P symétrique — EIGSI × AL BARAA CONSULTING — 2026*

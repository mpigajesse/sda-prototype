# Configuration — Node 3 : VM Kali Linux

**Statut :** ✅ Déployé et opérationnel  
**Date de mise en service :** 2026-05-26

---

## Identité du nœud

| Paramètre | Valeur |
|-----------|--------|
| OS | Kali Linux (64-bit) |
| Type | VM (VirtualBox / VMware) |
| Nom d'hôte Docker | `ec92ab7f9f4a` (container ID Syncthing) |
| Identifiant Syncthing (abrégé) | `VFTEXUZ` |
| Identifiant Syncthing (complet) | `VFTEXUZ-3T7QLXH-7ZBFASM-HCWNSKZ-END5ADX-SHD4HHE-IYGGR6I-PME5LQK` |
| IP LAN (eth0 — réseau externe) | `192.168.1.20` |
| IP LAN (eth1 — VMware VMnet1 host-only) | `192.168.200.128` ← **utilisée pour Syncthing P2P** |
| Rôle dans le mesh | Nœud de réplication P2P |

---

## État des services

| Conteneur | Statut | Port exposé |
|-----------|--------|-------------|
| `sda-backend` | ✅ healthy | interne Docker uniquement (accès via `docker compose exec` ou Nginx) |
| `sda-frontend` | ✅ healthy | via Nginx |
| `sda-nginx` | ✅ running | `443` (HTTPS/mTLS), `80` (redirect) |
| `sda-syncthing` | ✅ healthy | `8384` (GUI), `22000` (P2P) |

---

## Historique du déploiement — problèmes rencontrés et corrections

### 1. Installation Docker + clone du dépôt

```bash
sudo apt update && sudo apt install -y ca-certificates curl gnupg
# (ajout dépôt Docker officiel)
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker

mkdir -p ~/PFE && cd ~/PFE
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype
```

### 2. Génération des certificats TLS

```bash
bash scripts/generate-certs.sh
```

Certificats générés dans `config/nginx/certs/` :
- `ca.crt` / `ca.key` — Autorité de certification interne SDA
- `server.crt` / `server.key` — CN=`sda-node` (Nginx)
- `client.crt` / `client.key` — CN=`sda-client-node-1` (mTLS)

### 3. Premier lancement du stack

```bash
docker compose up --build -d
docker compose restart nginx   # recharger les certs après génération
```

**Problème :** `curl http://localhost:8000/health` → réponse vide  
**Cause :** le port `8000` n'est pas exposé à l'hôte (`expose:` ≠ `ports:` dans docker-compose.yml — design intentionnel)  
**Solution :** passer par Nginx (mTLS) ou par `docker compose exec`

```bash
# Fonctionne toujours :
docker compose exec sda-backend curl http://localhost:8000/health
curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key https://localhost/health
```

### 4. Création du fichier `.env`

Le stack avait démarré sans `.env` → clés par défaut (`DB_ENCRYPTION_KEY=changeme-replace-in-production`, `PARQUET_FERNET_KEY=` vide).

**Problème :** après création du `.env` avec les vraies clés de Node 1, le backend crashait :  
```
pysqlcipher3.dbapi2.DatabaseError: file is encrypted or is not a database
```
**Cause :** la `metadata_enc.db` avait été créée avec `changeme-replace-in-production`, SQLCipher ne peut pas l'ouvrir avec une clé différente.  
**Solution :** supprimer la DB et la recréer avec la bonne clé.

```bash
# Clés identiques à Node 1 (Win11) pour synchronisation Parquet inter-nœuds
cat > .env <<'EOF'
DB_ENCRYPTION_KEY=4a82d9f9199d1159159b55ef7359bc1c035d5587024e3ed15edb4f8f4b30bfb9
PARQUET_FERNET_KEY=PGKzI2PL8qrYh_IFs98fAguugjtpcOOzv4P05NbQ1lk=
EOF

rm -f data/db/metadata_enc.db data/db/analytics.duckdb
docker compose up -d --force-recreate sda-backend
```

### 5. Aliases zsh (script `scripts/sda-aliases.sh`)

**Problème :** le script utilisait `${BASH_SOURCE[0]}` qui n'existe pas dans zsh (shell par défaut de Kali) → chemin résolu en `/home/kalilinux/PFE/` au lieu de `.../sda-prototype/`  
**Correction :** fallback zsh avec `${(%):-%x}` + détection du shell  

```bash
git pull   # récupérer le fix
source scripts/sda-aliases.sh
echo 'source ~/PFE/sda-prototype/scripts/sda-aliases.sh' >> ~/.zshrc
```

### 6. Validation finale

```bash
sda-health   # → {"status": "operational", ...}
sda-ingest   # → {"status": "success", "audit_id": 1, "record_hash": "ad123..."}
sda-parquet  # → node3_kali_storage.parquet créé
```

---

## Syncthing — Couplage P2P

### État actuel

| Élément | Statut |
|---------|--------|
| GUI accessible | ✅ `http://localhost:8384` |
| ID complet connu | ✅ `VFTEXUZ-3T7QLXH-7ZBFASM-HCWNSKZ-END5ADX-SHD4HHE-IYGGR6I-PME5LQK` |
| Dossier `SDA_Shared` ajouté | ✅ `/var/syncthing/SDA_Shared` |
| Mot de passe GUI configuré | ✅ Configuré (`sda-admin-kali`) |
| Couplage avec Node 1 Win11 | ✅ Connecté — réplication bidirectionnelle validée |
| Couplage avec Node 2 Ubuntu | ⏳ À faire |

### Procédure de couplage

#### A. Ajouter le dossier SDA_Shared (GUI Kali → `http://localhost:8384`)

**+ Ajouter un dossier** :

| Champ | Valeur |
|-------|--------|
| Étiquette | `SDA_Shared` |
| Identifiant | `sda-shared` |
| Chemin | `/var/syncthing/SDA_Shared` |
| Type | Envoyer et recevoir |

#### B. Ajouter Node 1 (Win11) comme périphérique distant

**+ Ajouter un périphérique distant** :

| Champ | Valeur |
|-------|--------|
| ID | *(ID Syncthing Node 1 Win11 — `http://localhost:8384` → Actions → Voir l'ID)* |
| Nom | `Node1-Win11` |
| Adresse | `tcp://192.168.200.1:22000` ← IP VMnet1 de Win11 |
| Adresse Kali (à donner à Win11) | `tcp://192.168.200.128:22000` ← IP eth1 de Kali |
| Partage | Cocher `SDA_Shared` |

#### C. Accepter sur Node 1 Win11

Sur `http://localhost:8384` (Win11) : notification *"Node3-Kali veut se connecter"* → **Ajouter** → partager `SDA_Shared`

#### D. Test de réplication bout en bout ✅ VALIDÉ — 2026-05-26

```bash
# Injecter depuis Kali
sda-ingest
# → {"status": "success", "tenant_id": "node3_kali", "audit_id": 1, "record_hash": "ad123..."}

# Vérifier les fichiers synchronisés
ls -lh ~/PFE/sda-prototype/data/shared_storage/
```

**Résultat observé sur Kali :**
```
node1_win11_storage.parquet   976  May 25 21:43  ← synchronisé depuis Win11 ✅
node1_demo_storage.parquet    826  May 25 21:45  ← synchronisé depuis Win11 ✅
node3_kali_storage.parquet   1.1K  May 26 08:29  ← créé localement sur Kali ✅
bench_test_storage.parquet    623  May 25 20:01  ← synchronisé depuis Win11 ✅
tenant_000..009 (×10)         ...  May 25 20:00  ← benchmarks Win11         ✅
```

**Résultat observé sur Win11 :**
```
node3_kali_storage.parquet   1036  26/05/2026 08:29  ← synchronisé depuis Kali ✅
```

**Réplication P2P bidirectionnelle Win11 ↔ Kali : VALIDÉE.**

---

## Aliases disponibles (après `source scripts/sda-aliases.sh`)

| Alias | Action |
|-------|--------|
| `sda-health` | Health check backend |
| `sda-health-tls` | Health check via Nginx mTLS |
| `sda-ingest` | Test ingestion node3_kali |
| `sda-reconcile` | Déclenchement CRDT reconcile |
| `sda-ps` | Statut des conteneurs |
| `sda-logs-backend` | Logs backend en direct |
| `sda-logs-sync` | Logs Syncthing en direct |
| `sda-shell` | Shell dans le conteneur backend |
| `sda-db-reset` | Supprimer les DB pour repartir propre |
| `sda-parquet` | Lister les fichiers Parquet synchronisés |
| `sda-syncthing-id` | Afficher l'ID Syncthing complet |

---

## Sécurisation Syncthing GUI — ✅ Configurée

La GUI Syncthing était accessible sans mot de passe depuis le réseau local.

**Configuration appliquée** (`http://localhost:8384` → Actions → Configuration → Interface graphique) :
```
Nom d'utilisateur : sda-admin-kali
Mot de passe      : <mot de passe fort — min. 12 car., maj+min+chiffres+spéciaux>
```

**Effet :** HTTP 401 retourné à toute requête non authentifiée.  
**Traçabilité :** l'identifiant `sda-admin-kali` permet d'identifier le nœud source dans les logs en cas d'incident.

---

## Pare-feu (ufw)

```bash
sudo ufw allow 443/tcp    # HTTPS mTLS
sudo ufw allow 80/tcp     # HTTP → redirect HTTPS
sudo ufw allow 22000/tcp  # Syncthing P2P
sudo ufw allow 22000/udp  # Syncthing QUIC
sudo ufw allow 21027/udp  # mDNS local
sudo ufw reload && sudo ufw status
```

---

## Notes de déploiement

- Le port `8000` du backend **n'est pas exposé à l'hôte** — accès uniquement via `docker compose exec` ou Nginx (`443`)
- Les certificats TLS sont **auto-signés** (CA interne SDA-POC) — avertissement navigateur normal
- `DB_ENCRYPTION_KEY` et `PARQUET_FERNET_KEY` sont **identiques à Node 1 (Win11)** pour la lecture croisée des fichiers Parquet
- Le fichier `.env` n'est **pas versionné** (`.gitignore`) — transmis via canal sécurisé hors dépôt

---

*Node 3 — VM Kali Linux — SDA-Prototype v0.1 — EIGSI × AL BARAA CONSULTING*

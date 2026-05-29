# Configuration — Node 2 : VM Ubuntu 26.04 LTS

**Statut :** ✅ Déployé et opérationnel  
**Date de mise en service :** 2026-05-26  
**Date de validation complète :** 2026-05-27

---

## Identité du nœud

| Paramètre | Valeur |
|-----------|--------|
| OS | Ubuntu 26.04 LTS "resolute" (64-bit) |
| Nom d'hôte | `ubuntu2604` |
| Utilisateur | `ubuntu` / `sudo su -` pour root |
| Type | VM VMware |
| IP WAN (ens33 — accès internet) | `192.168.1.40` |
| IP LAN (ens37 — VMware VMnet1) | `192.168.200.130` ← **utilisée pour Syncthing P2P** |
| Docker | `29.1.3` |
| Docker Compose | `v5.1.4` |
| Identifiant Syncthing (complet) | *(à renseigner après déploiement)* |
| Rôle dans le mesh | Nœud de réplication P2P |

---

## État des services

| Conteneur | Statut | Port exposé |
|-----------|--------|-------------|
| `sda-backend` | ✅ healthy | interne Docker uniquement (accès via Nginx) |
| `sda-frontend` | ✅ healthy | via Nginx |
| `sda-nginx` | ✅ running | `443` (HTTPS/mTLS), `80` (redirect) |
| `sda-syncthing` | ✅ healthy | `8384` (GUI), `22000` (P2P) |

---

## Déploiement — Étapes

### 1. Installation Docker + dépendances

> **✅ Effectué le 2026-05-26**

```bash
# Étape 1 — Paquets de base (repos Ubuntu)
sudo apt update && sudo apt install -y \
    docker.io git curl openssl python3-pip

# Étape 2 — Ajouter le dépôt officiel Docker
# (docker-compose-plugin N'EST PAS dans les repos Ubuntu par défaut)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Étape 3 — Installer docker-compose-plugin depuis le dépôt officiel
sudo apt update
sudo apt install -y docker-compose-plugin   # installe aussi docker-buildx-plugin

# Étape 4 — Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Étape 5 — newgrp n'est pas installé par défaut sur Ubuntu 26.04
# Installer util-linux-extra puis appliquer le groupe
sudo apt install -y util-linux-extra
newgrp docker

# Vérifier
docker --version          # Docker version 29.1.3
docker compose version    # Docker Compose version v5.1.4
```

> **Remarque Ubuntu 26.04 "resolute"** : `newgrp` nécessite le paquet `util-linux-extra`, absent par défaut — contrairement à Ubuntu 24.04.

### 2. Cloner le dépôt

```bash
cd ~/Desktop/PFE
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype
```

### 3. Créer le fichier `.env`

Les clés doivent être **identiques à Node 1 (Win11)** pour que les fichiers Parquet soient lisibles entre nœuds.

```bash
cat > .env <<'EOF'
DB_ENCRYPTION_KEY=4a82d9f9199d1159159b55ef7359bc1c035d5587024e3ed15edb4f8f4b30bfb9
PARQUET_FERNET_KEY=PGKzI2PL8qrYh_IFs98fAguugjtpcOOzv4P05NbQ1lk=
EOF
```

> **Important** : ces clés sont celles de Node 1 Win11. Ne pas regénérer — sinon les Parquets chiffrés ne seront pas lisibles entre nœuds.

### 4. Générer les certificats TLS

```bash
bash scripts/generate-certs.sh
```

Certificats générés dans `config/nginx/certs/` :
- `ca.crt` / `ca.key` — Autorité de certification interne SDA
- `server.crt` / `server.key` — CN=`sda-node` (Nginx)
- `client.crt` / `client.key` — CN=`sda-client-node-1` (mTLS)

### 5. Lancer le stack Docker

```bash
docker compose up --build -d
sleep 30
docker compose ps
```

Résultat attendu :
```
NAME            STATUS
sda-backend     Up X minutes (healthy)
sda-frontend    Up X minutes (healthy)
sda-nginx       Up X minutes
sda-syncthing   Up X minutes (healthy)
```

### 6. Injection de la clé API Syncthing dans nginx — **Automatique depuis v0.2**

> **Mécanisme :** `scripts/nginx-entrypoint.sh` est exécuté par le conteneur nginx au démarrage.
> Il lit la clé API directement depuis `config/syncthing/config.xml` (monté en volume),
> écrit `config/nginx/certs/syncthing-key.conf`, puis lance nginx. Aucune action manuelle.

**Vérification que l'injection a bien eu lieu :**
```bash
docker compose logs nginx | grep "Clé injectée"
# → [sda-nginx] Clé injectée (FhrJ56rU...)
```

Le dashboard frontend affiche les métriques Syncthing dès le démarrage complet du stack.

> **Note historique :** avant la v0.2, cette étape nécessitait `bash scripts/setup-syncthing-key.sh`.
> Ce script est conservé pour usage debug/maintenance mais n'est plus requis au déploiement normal.

---

### 7. Vérification locale

```bash
# Via mTLS Nginx
curl -sk --cert config/nginx/certs/client.crt \
         --key  config/nginx/certs/client.key \
         https://localhost/health

# Via Docker exec (sans TLS)
docker compose exec sda-backend curl http://localhost:8000/health
```

Réponse attendue :
```json
{"status": "operational", "architecture": "local-first / distributed", "offline_ready": true}
```

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

## Sécurisation Syncthing GUI

Configurer un mot de passe dans `http://localhost:8384` → Actions → Configuration → Interface graphique :

```
Nom d'utilisateur : sda-admin-ubuntu
Mot de passe      : <mot de passe fort — min. 12 car., maj+min+chiffres+spéciaux>
```

**Traçabilité :** l'identifiant `sda-admin-ubuntu` permet d'identifier le nœud source dans les logs.

---

## Syncthing — Couplage P2P

### État actuel

| Élément | Statut |
|---------|--------|
| GUI accessible | ✅ `http://localhost:8384` |
| ID complet | *(récupérer via `http://localhost:8384` → Actions → Voir l'ID)* |
| Dossier `SDA_Shared` ajouté | ✅ `/var/syncthing/SDA_Shared` |
| Mot de passe GUI configuré | ✅ Configuré (`sda-admin-ubuntu`) |
| Couplage avec Node 1 Win11 | ✅ Connecté — réplication bidirectionnelle validée (2026-05-27) |
| Couplage avec Node 3 Kali | ✅ Connecté — réplication bidirectionnelle validée (2026-05-27) |

### Procédure de couplage

#### A. Récupérer l'ID Syncthing de ce nœud

```bash
# Via l'API Syncthing
curl -s http://localhost:8384/rest/system/status \
    -H "X-API-Key: $(docker exec sda-syncthing \
        cat /var/syncthing/config/config.xml | grep -oP '(?<=<apikey>)[^<]+')" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['myID'])"
```

Ou : `http://localhost:8384` → **Actions** → **Afficher l'ID de l'appareil**

ID Ubuntu : *(à renseigner)*

#### B. Ajouter Node 1 (Win11) comme périphérique distant

Dans `http://localhost:8384` → **+ Ajouter un périphérique distant** :

| Champ | Valeur |
|-------|--------|
| ID | *(ID Syncthing Node 1 Win11)* |
| Nom | `Node1-Win11` |
| Adresse | `tcp://192.168.200.1:22000` ← IP VMnet1 de Win11 |
| Partage | Cocher `SDA_Shared` |

#### C. Ajouter Node 3 (Kali) comme périphérique distant

| Champ | Valeur |
|-------|--------|
| ID | `VFTEXUZ-3T7QLXH-7ZBFASM-HCWNSKZ-END5ADX-SHD4HHE-IYGGR6I-PME5LQK` |
| Nom | `Node3-Kali` |
| Adresse | `tcp://192.168.200.128:22000` ← IP VMnet1 de Kali |
| Partage | Cocher `SDA_Shared` |

#### D. Accepter les invitations sur Node 1 et Node 3

- Sur Node 1 (`http://localhost:8384`) : notification *"Node2-Ubuntu veut se connecter"* → **Ajouter** → partager `SDA_Shared`
- Sur Node 3 Kali (`http://localhost:8384`) : idem

#### E. Test de réplication

```bash
# Injecter depuis Ubuntu
curl -sk --cert config/nginx/certs/client.crt \
         --key  config/nginx/certs/client.key \
         -X POST https://localhost/api/v1/data/ingest \
         -H "Content-Type: application/json" \
         -d '{"tenant_id": "node2_ubuntu", "data": {"metric": "cpu", "value": 42, "node": "ubuntu"}}'

# Vérifier les Parquets synchronisés (~15s)
ls -lh data/shared_storage/
# node2_ubuntu_storage.parquet doit apparaître ✅
# node1_win11_storage.parquet synchronisé depuis Win11 ✅
# node3_kali_storage.parquet synchronisé depuis Kali ✅
```

---

## Aliases bash (après déploiement)

Charger les aliases SDA :
```bash
source scripts/sda-aliases.sh
echo 'source ~/Desktop/PFE/sda-prototype/scripts/sda-aliases.sh' >> ~/.bashrc
```

| Alias | Action |
|-------|--------|
| `sda-health` | Health check backend |
| `sda-health-tls` | Health check via Nginx mTLS |
| `sda-ingest` | Test ingestion node2_ubuntu |
| `sda-reconcile` | Déclenchement CRDT reconcile |
| `sda-ps` | Statut des conteneurs |
| `sda-logs-backend` | Logs backend en direct |
| `sda-logs-sync` | Logs Syncthing en direct |
| `sda-shell` | Shell dans le conteneur backend |
| `sda-db-reset` | Supprimer les DB pour repartir propre |
| `sda-parquet` | Lister les fichiers Parquet synchronisés |
| `sda-syncthing-id` | Afficher l'ID Syncthing complet |

---

## Problèmes rencontrés et résolus

### P1 — `docker-compose-plugin` introuvable

**Symptôme :** `Unable to locate package docker-compose-plugin`  
**Cause :** Ubuntu 26.04 ne distribue pas `docker-compose-plugin` dans ses dépôts par défaut.  
**Solution :** Ajouter le dépôt apt officiel Docker avant installation (voir étape 1 ci-dessus).

---

### P2 — `newgrp: command not found`

**Symptôme :** `Command 'newgrp' not found` après `sudo usermod -aG docker $USER`  
**Cause :** `newgrp` fait partie du paquet `util-linux-extra`, absent par défaut sur Ubuntu 26.04 (contrairement à 24.04).  
**Solution :** `sudo apt install -y util-linux-extra` puis `newgrp docker`

---

### P3 — nginx crash : `invalid number of arguments in proxy_set_header`

**Symptôme :** `sda-nginx` s'arrête en boucle — logs : `invalid number of arguments in "proxy_set_header" directive`  
**Cause :** L'image `nginx:1.25-alpine` utilise `envsubst` (GNU gettext / Alpine) pour traiter les fichiers dans `/etc/nginx/templates/`. Sur Alpine, `envsubst` **détruit les variables nginx** (`$host`, `$remote_addr`, `$scheme`…) car il interprète tout `$variable` comme une variable shell. De plus `${SYNCTHING_API_KEY}` était vide → `proxy_set_header X-API-Key ;` (sans valeur → erreur syntaxe nginx).  
**Solution :** Contournement total d'envsubst — monter le fichier directement dans `/etc/nginx/conf.d/default.conf` au lieu de `/etc/nginx/templates/` :
```yaml
# docker-compose.yml
volumes:
  - ./config/nginx/nginx.conf.template:/etc/nginx/conf.d/default.conf:ro
```

---

### P4 — "Impossible de joindre Syncthing" dans le dashboard frontend

**Symptôme :** Dashboard frontend → `Impossible de joindre Syncthing. Vérifiez que le conteneur est démarré.`  
**Cause initiale (v0.1) :** nginx n'injectait pas le header `X-API-Key` requis par l'API Syncthing — la clé était node-specific et devait être injectée manuellement.  
**Solution v0.1 (manuelle) :** `bash scripts/setup-syncthing-key.sh`

**Solution v0.2 (automatique) :** `scripts/nginx-entrypoint.sh` est monté dans le conteneur nginx et s'exécute au démarrage. Il lit `config/syncthing/config.xml` (volume partagé) pour extraire la clé sans `docker exec`, l'écrit dans `syncthing-key.conf`, puis démarre nginx. Nginx attend que Syncthing soit `healthy` via `depends_on: condition: service_healthy`.

Architecture permanente :
- `config/nginx/certs/syncthing-key.conf` → exclu de git (`.gitignore`) — node-specific, généré auto.
- `config/nginx/nginx.conf.template` → `include syncthing-key.conf*` (glob, non-bloquant si absent)
- `scripts/nginx-entrypoint.sh` → point d'entrée nginx, versionné, commun à tous les nœuds

---

## Problèmes connus / À surveiller

| Symptôme | Cause | Solution |
|----------|-------|---------|
| `file is encrypted or is not a database` | Stack lancé sans `.env` avant d'ajouter les vraies clés | `rm data/db/metadata_enc.db && docker compose up -d --force-recreate sda-backend` |
| `sda-nginx` s'arrête en boucle | Certificats TLS absents | Vérifier `config/nginx/certs/` — relancer `bash scripts/generate-certs.sh` |
| Port `8000` inaccessible depuis l'hôte | Design intentionnel — non exposé | Utiliser `docker compose exec sda-backend curl` ou passer par Nginx |
| Syncthing ne voit pas les autres nœuds | Port 22000 bloqué sur `ens37` | Vérifier `ufw` et la connectivité `ping 192.168.200.1` |
| "Impossible de joindre Syncthing" après recreate | nginx n'a pas encore démarré / Syncthing pas healthy | `docker compose logs nginx` — la clé est réinjectée auto. au prochain démarrage nginx |

---

## Notes de déploiement

- Le port `8000` du backend **n'est pas exposé à l'hôte** — accès uniquement via `docker compose exec` ou Nginx (`443`)
- Les certificats TLS sont **auto-signés** (CA interne SDA-POC) — avertissement navigateur normal
- `DB_ENCRYPTION_KEY` et `PARQUET_FERNET_KEY` sont **identiques à Node 1 (Win11)** pour la lecture croisée des fichiers Parquet
- Le fichier `.env` n'est **pas versionné** (`.gitignore`) — les clés sont partagées via ce document de configuration
- Syncthing P2P utilise exclusivement l'interface `ens37` (`192.168.200.130`) — réseau LAN VMnet1 isolé du WAN

---

*Node 2 — VM Ubuntu 26.04 LTS "resolute" — SDA-Prototype v0.1 — EIGSI × AL BARAA CONSULTING*

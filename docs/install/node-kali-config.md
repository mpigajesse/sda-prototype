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
| Identifiant Syncthing (complet) | *(à compléter — `Actions → Voir l'ID` dans GUI)* |
| IP LAN | *(à compléter — `ip a show eth0`)* |
| Rôle dans le mesh | Nœud de réplication P2P |

---

## État des services

| Conteneur | Statut | Port exposé |
|-----------|--------|-------------|
| `sda-backend` | ✅ healthy | interne Docker uniquement |
| `sda-frontend` | ✅ healthy | via Nginx |
| `sda-nginx` | ✅ running | `443` (HTTPS/mTLS), `80` (redirect) |
| `sda-syncthing` | ✅ healthy | `8384` (GUI), `22000` (P2P) |

---

## Ce qui a été fait

### 1. Installation Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
# (ajout du dépôt Docker + apt install docker-ce docker-compose-plugin)
sudo usermod -aG docker $USER
```

### 2. Clone du dépôt

```bash
mkdir -p ~/PFE && cd ~/PFE
git clone https://github.com/mpigajesse/sda-prototype.git
cd sda-prototype
```

### 3. Fichier `.env`

Créé dans `~/PFE/sda-prototype/.env` avec :
```
DB_ENCRYPTION_KEY=<clé hex 32 octets générée>
PARQUET_FERNET_KEY=<clé Fernet générée>
```

> **Important :** la `PARQUET_FERNET_KEY` doit être **identique** sur tous les nœuds pour que les fichiers Parquet soient lisibles entre nœuds.

### 4. Génération des certificats TLS

```bash
bash scripts/generate-certs.sh
```

Certificats générés dans `config/nginx/certs/` :
- `ca.crt` / `ca.key` — Autorité de certification interne SDA
- `server.crt` / `server.key` — CN=`sda-node` (Nginx)
- `client.crt` / `client.key` — CN=`sda-client-node-1` (mTLS)

### 5. Lancement du stack

```bash
docker compose up --build -d
docker compose restart nginx   # après génération des certs
```

### 6. Validation mTLS

```bash
curl -sk \
  --cert config/nginx/certs/client.crt \
  --key  config/nginx/certs/client.key \
  https://localhost/health
# → {"status":"operational","architecture":"local-first / distributed",...}
```

---

## Syncthing — Couplage P2P (à finaliser)

### État actuel

| Élément | Statut |
|---------|--------|
| GUI accessible | ✅ `http://localhost:8384` |
| Dossier `SDA_Shared` ajouté | ⏳ À faire |
| Mot de passe GUI configuré | ⏳ Recommandé |
| Couplage avec Node 1 Win11 | ⏳ À faire |
| Couplage avec Node 2 Win10 | ⏳ À faire |

### Procédure de couplage (étapes restantes)

#### A. Récupérer l'ID complet de ce nœud

```bash
curl -s http://localhost:8384/rest/system/status \
  -H "X-API-Key: $(grep -oP '(?<=<apikey>)[^<]+' config/syncthing/config.xml)" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['myID'])"
```

#### B. Ajouter le dossier SDA_Shared

Dans GUI Syncthing (`http://localhost:8384`) → **+ Ajouter un dossier** :

| Champ | Valeur |
|-------|--------|
| Étiquette | `SDA_Shared` |
| Identifiant | `sda-shared` |
| Chemin | `/var/syncthing/SDA_Shared` |
| Type | Envoyer et recevoir |

#### C. Ajouter Node 1 (Win11) comme périphérique distant

**+ Ajouter un périphérique distant** :

| Champ | Valeur |
|-------|--------|
| ID | *(ID complet Syncthing Node 1 Win11)* |
| Nom | `Node1-Win11` |
| Adresse | `tcp://192.168.1.10:22000` |
| Partage | Cocher `SDA_Shared` |

#### D. Accepter la demande sur Node 1 Win11

Sur `http://192.168.1.10:8384` (ou `http://localhost:8384` depuis Win11) :
- Notification : *"Node3-Kali veut se connecter"* → **Ajouter le périphérique**
- Partager le dossier `SDA_Shared` avec Node 3 Kali

---

## Sécurisation recommandée (Syncthing GUI)

La GUI Syncthing est actuellement accessible sans mot de passe depuis le réseau.

**Configuration → GUI → Authentification** :

```
Nom d'utilisateur : sda-admin
Mot de passe      : <mot de passe fort>
```

Ou via API :
```bash
# Lire la config actuelle
curl -s http://localhost:8384/rest/config \
  -H "X-API-Key: $(grep -oP '(?<=<apikey>)[^<]+' config/syncthing/config.xml)" \
  | python3 -m json.tool | grep -A5 gui
```

---

## Pare-feu (ufw)

```bash
sudo ufw allow 443/tcp   # HTTPS mTLS
sudo ufw allow 80/tcp    # HTTP → redirect HTTPS
sudo ufw allow 22000/tcp # Syncthing P2P
sudo ufw allow 22000/udp # Syncthing QUIC
sudo ufw allow 21027/udp # mDNS local
sudo ufw reload
sudo ufw status
```

---

## Commandes utiles (depuis ~/PFE/sda-prototype)

```bash
# Statut des conteneurs
docker compose ps

# Logs backend
docker compose logs sda-backend -f

# Test health check (depuis l'intérieur)
docker compose exec sda-backend curl http://localhost:8000/health

# Test health check mTLS (depuis l'hôte)
curl -sk --cert config/nginx/certs/client.crt \
         --key  config/nginx/certs/client.key \
         https://localhost/health

# Test ingestion
curl -s -X POST http://localhost:8000/api/v1/data/ingest \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "node3_kali", "data": {"source": "kali_test"}}' \
  | python3 -m json.tool

# Redémarrer après modification .env
docker compose up -d --force-recreate sda-backend

# Arrêter le stack
docker compose down
```

---

## Notes de déploiement

- Le port `8000` du backend **n'est pas exposé à l'hôte** — uniquement accessible via Nginx (`:443`) ou depuis l'intérieur du réseau Docker
- Les certificats TLS sont **auto-signés** (CA interne SDA-POC) — avertissement normal dans le navigateur
- La clé `PARQUET_FERNET_KEY` doit être synchronisée manuellement entre tous les nœuds pour la lecture croisée des fichiers Parquet
- Le fichier `.env` n'est **pas versionné** (`.gitignore`) — à transmettre via canal sécurisé entre administrateurs de nœuds

---

*Node 3 — VM Kali Linux — SDA-Prototype v0.1 — EIGSI × AL BARAA CONSULTING*

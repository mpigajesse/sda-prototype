# Guide de Déploiement — Nouveau Nœud SDA

Ce guide permet de déployer un nœud SDA opérationnel sur **n'importe quelle machine** : VM Ubuntu, VM Kali Linux, PC physique Windows, ou serveur. Il est auto-suffisant — aucune connaissance du prototype existant n'est requise.

**Durée estimée :** 20–40 min selon la vitesse de téléchargement Docker.

---

## Prérequis matériels et réseau

| Exigence | Minimum | Recommandé |
|----------|---------|------------|
| RAM | 2 Go | 4 Go |
| Disque | 10 Go libres | 20 Go |
| CPU | 2 cœurs | 4 cœurs |
| Réseau | LAN ou VPN avec Node 1 | LAN filaire 100 Mbit/s |
| OS | Linux (Ubuntu 24.04 / Kali / Debian) ou Windows 11 | — |

> **Connectivité requise** : le nœud doit pouvoir joindre au moins un autre nœud SDA sur le port **22000/TCP+UDP** (Syncthing P2P). Sur un LAN domestique, ouvrir ce port dans le pare-feu suffit.

---

## Étape 1 — Installer les dépendances

=== "Windows 11"

    ### 1.1 Installer Docker Desktop

    1. Télécharger [Docker Desktop pour Windows](https://www.docker.com/products/docker-desktop/)
    2. Lancer l'installeur, cocher **"Use WSL 2 instead of Hyper-V"** si proposé
    3. Redémarrer la machine après installation
    4. Vérifier :
       ```powershell
       docker --version
       docker compose version
       ```

    ### 1.2 Installer Git

    1. Télécharger [Git pour Windows](https://git-scm.com/download/win)
    2. Installer avec les options par défaut (inclut Git Bash)
    3. Vérifier :
       ```powershell
       git --version
       ```

    ### 1.3 Vérifier la virtualisation (VM uniquement)

    Dans VirtualBox/VMware, activer la virtualisation imbriquée si la VM est sur une machine host qui supporte VT-x/AMD-V :
    ```
    VirtualBox : Machine > Paramètres > Système > Processeur > activer "VT-x/AMD-V imbriqué"
    ```

=== "Kali Linux / Debian / Ubuntu"

    ### 1.1 Installer Docker Engine

    ```bash
    # Désinstaller les anciennes versions
    sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

    # Ajouter le dépôt Docker officiel
    sudo apt update
    sudo apt install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | \
        sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/debian \
        $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Ajouter l'utilisateur courant au groupe docker (évite sudo)
    sudo usermod -aG docker $USER
    newgrp docker

    # Vérifier
    docker --version
    docker compose version
    ```

    ### 1.2 Installer Git

    ```bash
    sudo apt install -y git openssl curl
    ```

---

## Étape 2 — Cloner le dépôt

=== "Windows (PowerShell)"

    ```powershell
    cd C:\
    mkdir PFE -ErrorAction SilentlyContinue
    cd PFE
    git clone https://github.com/mpigajesse/sda-prototype.git
    cd sda-prototype
    ```

=== "Linux (Bash)"

    ```bash
    mkdir -p ~/PFE
    cd ~/PFE
    git clone https://github.com/mpigajesse/sda-prototype.git
    cd sda-prototype
    ```

---

## Étape 3 — Créer le fichier `.env`

Le fichier `.env` contient les clés de chiffrement. **Chaque nœud peut utiliser les mêmes clés** (le chiffrement est symétrique pour la démo).

=== "Windows (PowerShell)"

    ```powershell
    # Générer une clé DB (hex 32 octets)
    $DB_KEY = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })

    # Générer une clé Fernet (base64 URL-safe 32 octets)
    # Option A : si Python est installé
    $FERNET_KEY = python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Option B : utiliser la clé de Node 1 (contacter l'administrateur du nœud maître)

    @"
DB_ENCRYPTION_KEY=$DB_KEY
PARQUET_FERNET_KEY=$FERNET_KEY
"@ | Set-Content .env -Encoding UTF8

    Get-Content .env
    ```

    > **Important** : pour que Syncthing puisse lire les fichiers Parquet des autres nœuds, tous les nœuds doivent partager la **même** `PARQUET_FERNET_KEY`.

=== "Linux (Bash)"

    ```bash
    # Générer les clés
    DB_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    FERNET_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

    cat > .env <<EOF
DB_ENCRYPTION_KEY=$DB_KEY
PARQUET_FERNET_KEY=$FERNET_KEY
EOF

    echo "Clés générées :"
    cat .env
    ```

---

## Étape 4 — Générer les certificats TLS

Les certificats permettent le chiffrement TLS 1.3 et l'authentification mutuelle (mTLS) entre le client et le nœud.

=== "Windows (Git Bash)"

    Ouvrir **Git Bash** (pas PowerShell) :
    ```bash
    # Depuis le répertoire sda-prototype
    MSYS_NO_PATHCONV=1 bash scripts/generate-certs.sh
    ```

    !!! warning "Git Bash requis"
        Le script utilise `openssl` avec des chemins Unix. Exécuter **impérativement depuis Git Bash**, pas depuis CMD ou PowerShell.

=== "Linux (Bash)"

    ```bash
    bash scripts/generate-certs.sh
    ```

Vérifier que les certificats ont été créés :

```
config/nginx/certs/
├── ca.crt          ← Autorité de certification racine (à importer dans le navigateur)
├── ca.key          ← Clé privée CA (ne pas diffuser)
├── server.crt      ← Certificat serveur Nginx (inclut SAN DNS:localhost)
├── server.key      ← Clé privée serveur
├── client.crt      ← Certificat client mTLS
├── client.key      ← Clé privée client
└── sda-client.p12  ← Bundle PKCS#12 pour import navigateur (mot de passe : sda2026)
```

---

## Étape 5 — Lancer le stack Docker

=== "Windows (PowerShell)"

    ```powershell
    docker compose up --build -d
    ```

=== "Linux (Bash)"

    ```bash
    docker compose up --build -d
    ```

La première fois, Docker télécharge et compile les images (~5–15 min selon la connexion).

### Vérifier que tout est démarré

```powershell
# Windows
docker compose ps
```

```bash
# Linux
docker compose ps
```

Résultat attendu :

```
NAME            STATUS
sda-syncthing   Up X minutes (healthy)
sda-backend     Up X minutes (healthy)
sda-frontend    Up X minutes (healthy)
sda-nginx       Up X minutes
```

> **Clé API Syncthing — injection automatique :**
> Le conteneur nginx attend que Syncthing soit `healthy`, puis `scripts/nginx-entrypoint.sh`
> lit la clé API depuis `config/syncthing/config.xml` et l'injecte avant de lancer nginx.
> Vérifier avec `docker compose logs nginx | grep "Clé injectée"`.
> **Aucune action manuelle requise** — le dashboard frontend affiche les métriques Syncthing dès le démarrage.

---

## Étape 6 — Valider le déploiement (tests locaux)

### 6.1 Health check

```powershell
# Windows
Invoke-RestMethod http://localhost:8000/health
```

```bash
# Linux
curl -s http://localhost:8000/health | python3 -m json.tool
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

### 6.2 Test d'ingestion

```powershell
# Windows
$body = @{
    tenant_id = "node_test"
    data      = @{ source = "deployment_validation"; timestamp = (Get-Date -Format "o") }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod http://localhost:8000/api/v1/data/ingest `
    -Method POST -Body $body -ContentType "application/json"
```

```bash
# Linux
curl -s -X POST http://localhost:8000/api/v1/data/ingest \
    -H "Content-Type: application/json" \
    -d '{"tenant_id": "node_test", "data": {"source": "deployment_validation"}}' \
    | python3 -m json.tool
```

Réponse attendue :
```json
{
  "status": "success",
  "tenant_id": "node_test",
  "record_hash": "...",
  "audit_id": 1,
  "parquet_path": "..."
}
```

### 6.3 Test HTTPS / mTLS

```bash
# Depuis l'intérieur d'un conteneur (OpenSSL curl)
docker exec sda-backend curl -sk \
    --cert /tmp/client.crt --key /tmp/client.key \
    https://nginx/health
```

Ou copier les certs dans le conteneur d'abord :
```bash
docker cp config/nginx/certs/client.crt sda-backend:/tmp/client.crt
docker cp config/nginx/certs/client.key sda-backend:/tmp/client.key
docker exec sda-backend curl -sk \
    --cert /tmp/client.crt --key /tmp/client.key \
    https://nginx/health
```

### 6.4 Accéder au frontend via navigateur (mTLS)

Le frontend est servi en HTTPS avec mTLS — le navigateur doit présenter un certificat client signé par la CA interne SDA. Deux étapes : importer la CA de confiance, puis le certificat client.

=== "Windows 11 — Chrome / Edge"

    Ouvrir **PowerShell** :
    ```powershell
    # 1. Importer la CA dans le magasin de confiance
    certutil -addstore -user "Root" "config\nginx\certs\ca.crt"

    # 2. Importer le certificat client
    Import-PfxCertificate `
      -FilePath "config\nginx\certs\sda-client.p12" `
      -CertStoreLocation Cert:\CurrentUser\My `
      -Password (ConvertTo-SecureString "sda2026" -AsPlainText -Force)
    ```

    Fermer et rouvrir Chrome/Edge. Naviguer vers `https://localhost/`.  
    Chrome propose une sélection de certificat → choisir **`sda-client-node-1`** → OK.

=== "Kali Linux / Debian — Firefox"

    ```bash
    # Générer le .p12 si pas encore fait (inclus dans generate-certs.sh)
    openssl pkcs12 -export \
      -out config/nginx/certs/sda-client.p12 \
      -inkey config/nginx/certs/client.key \
      -in config/nginx/certs/client.crt \
      -certfile config/nginx/certs/ca.crt \
      -passout pass:sda2026
    ```

    Dans **Firefox** :
    1. `Paramètres` → `Vie privée et sécurité` → `Afficher les certificats`
    2. Onglet **Autorités** → **Importer** → sélectionner `config/nginx/certs/ca.crt`  
       → cocher ✅ *"Faire confiance pour les sites web"*
    3. Onglet **Vos certificats** → **Importer** → sélectionner `sda-client.p12`  
       → mot de passe : `sda2026`

    Naviguer vers `https://localhost/` ou `https://192.168.200.1/` (depuis une autre VM).

=== "Linux — Chrome / Chromium (NSS)"

    ```bash
    # Créer le NSS DB s'il n'existe pas
    mkdir -p ~/.pki/nssdb
    certutil -d sql:$HOME/.pki/nssdb -N --empty-password 2>/dev/null || true

    # Importer la CA
    certutil -d sql:$HOME/.pki/nssdb -A -t 'CT,,' \
      -n SDA-Internal-CA -i config/nginx/certs/ca.crt

    # Importer le certificat client
    pk12util -d sql:$HOME/.pki/nssdb \
      -i config/nginx/certs/sda-client.p12 -W sda2026
    ```

    Fermer et rouvrir Chrome. Naviguer vers `https://localhost/`.

Résultat attendu : le frontend SDA s'affiche **sans avertissement de sécurité**.

| Service | URL |
|---------|-----|
| Frontend SDA (mTLS) | `https://localhost/` |
| API Swagger | `https://localhost/docs` |
| Syncthing GUI | `http://localhost:8384` |

---

## Étape 7 — Coupler avec les autres nœuds (Syncthing P2P)

!!! info "Cette étape est nécessaire pour la synchronisation P2P"
    Sans couplage Syncthing, chaque nœud fonctionne en mode isolé. Les données ne se répliquent pas.

### 7.1 Obtenir l'ID Syncthing de ce nœud

Ouvrir `http://localhost:8384` → menu **Actions** → **Voir l'ID**

Ou via l'API :
```bash
curl -s http://localhost:8384/rest/system/status \
    -H "X-API-Key: $(docker exec sda-syncthing cat /var/syncthing/config/config.xml | grep -oP '(?<=<apikey>)[^<]+')" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['myID'])"
```

### 7.2 Ajouter un nœud distant

Sur ce nœud, ouvrir `http://localhost:8384` :

1. **Ajouter un périphérique distant** → cliquer "+ Ajouter un périphérique distant"
2. Renseigner l'**ID Syncthing** du nœud distant (obtenu sur ce nœud)
3. **Nom** : ex. `Node1-Win11` ou `Node3-Kali`
4. **Adresse** : `tcp://192.168.1.10:22000` (IP du nœud distant)
5. Cliquer **Enregistrer**

Répéter sur le nœud distant (ajouter l'ID de ce nœud).

### 7.3 Partager le dossier `SDA_Shared`

Sur ce nœud, dans Syncthing GUI :

1. Aller dans **Dossiers** → cliquer sur le dossier `SDA_Shared`
2. Onglet **Partage** → cocher le nœud distant ajouté
3. Cliquer **Enregistrer**

Répéter sur le nœud distant.

### 7.4 Vérifier la synchronisation

Statut attendu dans Syncthing GUI : **"À jour"** (vert) pour tous les nœuds couplés.

Test de bout en bout :
```bash
# Sur ce nœud : injecter une donnée
curl -s -X POST http://localhost:8000/api/v1/data/ingest \
    -H "Content-Type: application/json" \
    -d '{"tenant_id": "sync_test", "data": {"msg": "p2p_replication_test"}}'

# Attendre 5–30 secondes, puis vérifier sur Node 1 :
# ls data/shared_storage/   ← le fichier .parquet doit apparaître
```

---

## Étape 8 — Pare-feu (ports à ouvrir)

### Windows

```powershell
# Ouvrir les ports nécessaires dans le pare-feu Windows
New-NetFirewallRule -DisplayName "SDA-HTTPS"     -Direction Inbound -Protocol TCP -LocalPort 443  -Action Allow
New-NetFirewallRule -DisplayName "SDA-HTTP"      -Direction Inbound -Protocol TCP -LocalPort 80   -Action Allow
New-NetFirewallRule -DisplayName "SDA-Syncthing" -Direction Inbound -Protocol TCP -LocalPort 22000 -Action Allow
New-NetFirewallRule -DisplayName "SDA-Syncthing" -Direction Inbound -Protocol UDP -LocalPort 22000 -Action Allow
New-NetFirewallRule -DisplayName "SDA-mDNS"      -Direction Inbound -Protocol UDP -LocalPort 21027 -Action Allow
```

### Linux

```bash
# ufw (Ubuntu/Debian/Kali)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 80/tcp    # HTTP redirect
sudo ufw allow 22000/tcp # Syncthing P2P
sudo ufw allow 22000/udp # Syncthing QUIC
sudo ufw allow 21027/udp # mDNS discovery
sudo ufw reload
sudo ufw status
```

---

## Étape 9 — Démarrage automatique (optionnel)

Pour que le stack SDA démarre automatiquement au boot de la machine :

=== "Windows"

    Créer une tâche planifiée au démarrage de session :
    ```powershell
    $action = New-ScheduledTaskAction -Execute "docker" `
        -Argument "compose -f C:\PFE\sda-prototype\docker-compose.yml up -d" `
        -WorkingDirectory "C:\PFE\sda-prototype"
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    Register-ScheduledTask -TaskName "SDA-AutoStart" `
        -Action $action -Trigger $trigger -RunLevel Highest
    ```

=== "Linux (systemd)"

    ```bash
    sudo tee /etc/systemd/system/sda.service > /dev/null <<EOF
[Unit]
Description=Sovereign Data Agent
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER/PFE/sda-prototype
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable sda
    sudo systemctl start sda
    sudo systemctl status sda
    ```

---

## Tableau de bord — Récapitulatif des URLs

| Service | URL locale | Notes |
|---------|-----------|-------|
| API REST | `http://localhost:8000` | Interne — passer par Nginx en prod |
| Swagger / OpenAPI | `http://localhost:8000/docs` | Documentation interactive |
| Frontend | `http://localhost` | Dashboard SDA |
| HTTPS (mTLS) | `https://localhost` | Requiert certificat client |
| Syncthing GUI | `http://localhost:8384` | Admin P2P — accès local uniquement |
| Syncthing P2P | `<IP_LAN>:22000` | Port à ouvrir dans le pare-feu |

---

## Dépannage

### Le conteneur `sda-backend` redémarre en boucle

```bash
docker compose logs sda-backend --tail=50
```

| Erreur | Cause | Solution |
|--------|-------|----------|
| `file is encrypted or is not a database` | Fichier SQLite plaintext ouvert avec SQLCipher | Supprimer `data/db/metadata_enc.db` et redémarrer |
| `function takes at most 3 arguments` | Ancienne version du code (bug pysqlcipher3) | Faire `git pull && docker compose build sda-backend` |
| `PARQUET_FERNET_KEY missing or invalid` | Clé Fernet absente ou malformée | Vérifier le fichier `.env` |
| `cannot open database file` | Permissions sur `data/db/` | `chmod 700 data/db/` (Linux) |

### Syncthing ne synchronise pas

```bash
# Vérifier les logs Syncthing
docker compose logs syncthing --tail=30

# Vérifier la connectivité réseau entre nœuds
# Depuis Node 2 → Node 1
Test-NetConnection -ComputerName 192.168.1.10 -Port 22000  # Windows
nc -zv 192.168.1.10 22000                                  # Linux
```

Causes fréquentes :
- Pare-feu bloquant le port 22000
- Les deux nœuds ne se sont pas mutuellement ajoutés dans Syncthing GUI
- Le dossier `SDA_Shared` n'est pas partagé avec le nœud distant

### "Adresse active" Syncthing affiche 172.21.0.x au lieu de 192.168.200.x (Win11)

**Symptôme :** Dans la GUI Syncthing (`http://localhost:8384`) sur Win11, la fiche d'un pair distant affiche :
```
Adresse active     172.21.0.1:40088
Adresses configurées  tcp://192.168.200.130:22000
```

**Cause — NAT Docker sur Windows :** Comportement normal et attendu. Docker sur Windows (via WSL2) NAT-masquerade toutes les connexions TCP entrantes sur les ports publiés. Quand une VM se connecte à Win11 sur le port 22000, le noyau Linux de WSL2 réécrit l'IP source (ex. `192.168.200.130`) en `172.21.0.1` (passerelle du bridge Docker interne) avant de la transmettre au conteneur Syncthing.

```
VM (192.168.200.130) ──→ Win11 VMnet1 (192.168.200.1:22000)
                              │  Docker NAT masquerade
                              ▼
              Conteneur sda-syncthing voit : 172.21.0.1:xxxxx
```

**Ce n'est pas un problème :** La synchronisation fonctionne à 100% car :
- Win11 → VMs : Syncthing utilise l'adresse configurée (`192.168.200.x`) pour les connexions sortantes ✅
- VMs → Win11 : les VMs se connectent bien sur `192.168.200.1:22000`, Docker fait le relais ✅

L'"adresse active" `172.21.0.1` est un artefact d'affichage du NAT Docker Windows, pas un problème réseau. Sur Linux natif, l'IP réelle du pair serait visible — sur Windows avec Docker Desktop, ce n'est pas possible sans configuration macvlan avancée inutile ici.

### `docker: command not found` (Linux)

```bash
# Docker n'est pas dans le PATH ou le groupe n'est pas rechargé
sudo usermod -aG docker $USER
newgrp docker
# Ou redémarrer la session
```

### Erreur de certificat dans le navigateur

| Erreur Chrome | Cause | Solution |
|--------------|-------|---------|
| `ERR_CERT_AUTHORITY_INVALID` | CA interne non reconnue | Importer `ca.crt` (voir Étape 6.4) |
| `ERR_CERT_COMMON_NAME_INVALID` | Certificat sans SAN | Régénérer les certs : `bash scripts/generate-certs.sh` |
| `ERR_BAD_SSL_CLIENT_AUTH_CERT` | Certificat client absent | Importer `sda-client.p12` (voir Étape 6.4) |
| HTTP 400 "No required SSL certificate" | Chrome n'envoie pas le cert | Redémarrer Chrome complètement et réessayer |

---

## Checklist de validation finale

Cocher chaque point avant de déclarer le nœud opérationnel :

- [ ] `docker compose ps` → 4 conteneurs démarrés, 3 en état `healthy` (nginx n'a pas de healthcheck)
- [ ] `docker compose logs nginx | grep "Clé injectée"` → clé API Syncthing injectée automatiquement
- [ ] `GET http://localhost:8000/health` → `{"status": "operational"}`
- [ ] `POST /api/v1/data/ingest` → retourne un `record_hash`
- [ ] `http://localhost:8384` → Syncthing GUI accessible
- [ ] Port 22000 ouvert dans le pare-feu
- [ ] Nœud ajouté dans Syncthing des autres nœuds
- [ ] Dossier `SDA_Shared` partagé et statut "À jour"
- [ ] `https://localhost` accessible sans avertissement (CA importée + cert client installé)

---

*Guide rédigé pour SDA-Prototype v0.1 — EIGSI × AL BARAA CONSULTING — Jesse MPIGA-ODOUMBA (Promo 2026)*

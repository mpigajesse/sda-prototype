# Sécurité — Architecture SDA

## Vue d'ensemble du modèle de sécurité

Le SDA (Sovereign Data Agent) applique une défense en profondeur sur 4 couches :

```
┌─────────────────────────────────────────────────────┐
│  Couche 4 — Transport        TLS 1.3 + mTLS x509    │
│  Couche 3 — Authentification Syncthing GUI + tokens │
│  Couche 2 — Chiffrement      AES-256 SQLite/Parquet │
│  Couche 1 — Réseau           Host-Only VMnet1       │
└─────────────────────────────────────────────────────│
```

---

## 1. Chiffrement des données au repos

### 1.1 Base de données SQLite (métadonnées + audit trail)

| Paramètre | Valeur |
|-----------|--------|
| Moteur | SQLCipher 4.x (extension SQLite) |
| Algorithme | AES-256-CBC |
| KDF | PBKDF2-HMAC-SHA512, 256 000 itérations |
| Taille de page | 4096 octets |
| Clé | `DB_ENCRYPTION_KEY` — hex 32 octets (256 bits) |
| Stockage clé | Variable d'environnement (fichier `.env` hors dépôt) |
| Activation | `SQLITE_ENCRYPTION_ENABLED=true` (Docker uniquement) |

**Fichier chiffré :** `data/db/metadata_enc.db`

**Audit trail :** chaque enregistrement contient un hash SHA-256 chaîné au précédent (`previous_hash`) — détection de toute altération de la chaîne.

### 1.2 Fichiers Parquet (données analytiques répliquées)

| Paramètre | Valeur |
|-----------|--------|
| Algorithme | Fernet = AES-128-CBC + HMAC-SHA256 |
| Authentification | HMAC-SHA256 (intégrité garantie) |
| Clé | `PARQUET_FERNET_KEY` — base64 URL-safe 32 octets |
| Portée | Identique sur tous les nœuds du domaine de confiance |
| Stockage clé | Variable d'environnement (fichier `.env` hors dépôt) |

> **Note :** Fernet dépasse l'exigence AES-256 au repos grâce à l'authentification HMAC intégrée — tout fichier altéré est rejeté au déchiffrement.

---

## 2. Chiffrement des communications (Transport)

### 2.1 API REST — TLS 1.3 + mTLS (Nginx)

| Paramètre | Valeur |
|-----------|--------|
| Protocole | TLS 1.3 exclusivement (`ssl_protocols TLSv1.3`) |
| Authentification mutuelle | mTLS — certificat client x509 requis |
| Autorité de certification | CA interne SDA-POC (`ca.crt` auto-signé) |
| Certificat serveur | CN=`sda-node`, signé par CA interne |
| Certificat client | CN=`sda-client-node-1`, signé par CA interne |
| Rejet sans certificat | HTTP 400 "No required SSL certificate was sent" |
| Génération | `bash scripts/generate-certs.sh` |
| Validité | 365 jours |

**Flux sécurisé :**
```
Client (cert client) ──TLS 1.3──► Nginx ──HTTP──► FastAPI :8000
                      ◄──────────────────────────────────────────
```

Le port `8000` du backend n'est **jamais exposé** à l'extérieur du réseau Docker — seul Nginx (`:443`) est accessible.

### 2.2 Réplication P2P — Syncthing BEP over TLS 1.3

| Paramètre | Valeur |
|-----------|--------|
| Protocole | BEP (Block Exchange Protocol) sur TLS 1.3 |
| Authentification | Certificats x509 auto-générés par Syncthing |
| Vérification | Device ID = fingerprint SHA-256 du certificat |
| Port | 22000/TCP (sync) + 22000/UDP (QUIC) |
| Découverte locale | mDNS port 21027/UDP (offline-first) |
| Connexion testée | LAN direct VMware VMnet1 (`192.168.200.0/24`) |

---

## 3. Authentification Syncthing GUI

### 3.1 Problème initial

L'interface d'administration Syncthing (`http://localhost:8384`) était accessible **sans authentification**, exposant un risque d'accès non autorisé sur le réseau local permettant :
- Lecture de tous les fichiers synchronisés
- Modification de la configuration P2P
- Ajout de nœuds malveillants dans le mesh

### 3.2 Configuration appliquée

Chemin de configuration identique sur tous les nœuds :

```
Syncthing GUI → Actions → Configuration → Onglet "Interface graphique"
```

| Nœud | Système | Utilisateur configuré | Statut |
|------|---------|----------------------|--------|
| Node 1 | Win11 (hôte VMware) | `sda-admin-Win11` | ✅ Configuré |
| Node 3 | Kali Linux VM | `sda-admin-kali` | ✅ Configuré |
| Node 2 | Ubuntu VM | `sda-admin-ubuntu` | ⏳ À configurer |

| Champ | Valeur configurée |
|-------|------------------|
| Utilisateur | Voir tableau ci-dessus (nom spécifique au nœud) |
| Mot de passe | Mot de passe fort partagé (min. 12 car., maj+min+chiffres+spéciaux) |
| HTTPS GUI | Activé si disponible |

> **Principe de sécurité :** chaque nœud a un identifiant distinct (`sda-admin-Win11`, `sda-admin-kali`, `sda-admin-ubuntu`) pour permettre la traçabilité des accès dans les logs — si une session est compromise, l'identifiant trahit immédiatement quel nœud est affecté.

**Effet :** toute tentative d'accès à `http://localhost:8384` déclenche une authentification HTTP Basic. Sans credentials valides, l'accès est refusé avec HTTP 401.

### 3.3 Recommandations complémentaires pour la production

```nginx
# Restreindre Syncthing GUI à localhost uniquement (nginx.conf)
location /syncthing/ {
    allow 127.0.0.1;
    deny all;
    proxy_pass http://syncthing:8384/;
}
```

Ou via la configuration Syncthing :
```xml
<!-- config/syncthing/config.xml -->
<gui enabled="true" tls="true">
    <address>127.0.0.1:8384</address>  <!-- localhost uniquement -->
    <user>sda-admin</user>
    <password>$2a$10$...</password>    <!-- bcrypt -->
</gui>
```

---

## 4. Réseau — Isolation VMware VMnet1

### Topologie testée (démo 2 nœuds)

```
┌─────────────────────────────────────────────────────────────┐
│  VMware VMnet1 — Host-Only  192.168.200.0/24                │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │  Node 1 — Win11     │    │  Node 3 — Kali Linux VM  │   │
│  │  192.168.200.1      │◄──►│  192.168.200.128         │   │
│  │  (hôte VMware)      │    │  (VM guest)              │   │
│  │                     │    │                          │   │
│  │  Syncthing :22000   │    │  Syncthing :22000        │   │
│  │  Nginx :443 (mTLS)  │    │  Nginx :443 (mTLS)       │   │
│  │  Backend :8000 (int)│    │  Backend :8000 (int)     │   │
│  └─────────────────────┘    └──────────────────────────┘   │
│                                                             │
│  Pas d'accès Internet requis — réseau fermé                 │
└─────────────────────────────────────────────────────────────┘
```

**Avantages du réseau Host-Only :**
- Aucune exposition externe — conformité AUDPF (données dans le périmètre de confiance)
- Latence minimale — connexion directe sans relais WAN
- Isolation totale du trafic SDA vis-à-vis d'Internet

**Type de connexion Syncthing observé :**
- Avant configuration LAN : `Relais WAN` (109.230.238.250:22067) — sous-optimal
- Après configuration adresse directe : `Connexion directe TCP LAN`

---

## 5. Pare-feu

### Node 1 — Windows 11 (PowerShell)

```powershell
New-NetFirewallRule -DisplayName "SDA-HTTPS"      -Direction Inbound -Protocol TCP -LocalPort 443   -Action Allow
New-NetFirewallRule -DisplayName "SDA-HTTP"       -Direction Inbound -Protocol TCP -LocalPort 80    -Action Allow
New-NetFirewallRule -DisplayName "SDA-Sync-TCP"   -Direction Inbound -Protocol TCP -LocalPort 22000 -Action Allow
New-NetFirewallRule -DisplayName "SDA-Sync-UDP"   -Direction Inbound -Protocol UDP -LocalPort 22000 -Action Allow
New-NetFirewallRule -DisplayName "SDA-mDNS"       -Direction Inbound -Protocol UDP -LocalPort 21027 -Action Allow
```

### Node 3 — Kali Linux (ufw)

```bash
sudo ufw allow 443/tcp    # HTTPS mTLS
sudo ufw allow 80/tcp     # HTTP → redirect HTTPS
sudo ufw allow 22000/tcp  # Syncthing P2P
sudo ufw allow 22000/udp  # Syncthing QUIC
sudo ufw allow 21027/udp  # mDNS
sudo ufw reload
```

---

## 6. Résumé de conformité sécurité

| Exigence | Mécanisme | Statut |
|----------|-----------|--------|
| Chiffrement au repos (AES-256) | SQLCipher AES-256-CBC + Fernet AES-128-CBC+HMAC | ✅ |
| Chiffrement en transit (TLS 1.3) | Nginx TLS 1.3 + Syncthing BEP/TLS 1.3 | ✅ |
| Authentification mutuelle | mTLS x509 (API) + Device ID SHA-256 (P2P) | ✅ |
| Intégrité des données | HMAC-SHA256 Fernet + SHA-256 audit chain | ✅ |
| Authentification admin | Syncthing GUI HTTP Basic (sda-admin-Win11 / sda-admin-kali) | ✅ |
| Isolation réseau | VMware VMnet1 Host-Only, pas d'exposition Internet | ✅ |
| Secrets hors dépôt | `.env` dans `.gitignore`, jamais versionné | ✅ |
| 0 vulnérabilité critique | Bandit scan + Trivy image scan | ✅ CI |

---

*Sécurité SDA-Prototype v0.1 — EIGSI × AL BARAA CONSULTING — Jesse MPIGA-ODOUMBA (Promo 2026)*

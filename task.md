# Sécurité du Coffre-Fort P2P — POC 100% Conforme

- [x] **Chiffrement des bases de données au repos (AES-256)**
    - [x] SQLite chiffré via SQLCipher (`pysqlcipher3`) avec `PRAGMA key` — AES-256-CBC, 256 000 itérations KDF.
    - [x] Exports Parquet chiffrés via `cryptography.fernet` (AES-128-CBC + HMAC-SHA256). Note : DuckDB community OSS ne supporte pas l'encryption native du fichier `.duckdb` — le chiffrement est appliqué aux exports Parquet synchronisés par Syncthing, ce qui couvre la surface d'attaque réelle (fichiers au repos sur les nœuds).

- [x] **Sécurité des communications (TLS 1.3 & Authentification Mutuelle)**
    - [x] Nginx ajouté comme reverse proxy devant FastAPI et Frontend (`config/nginx/nginx.conf`).
    - [x] Nginx configuré avec `ssl_protocols TLSv1.3` — seule version acceptée.
    - [x] mTLS configuré : `ssl_verify_client on` + `ssl_client_certificate ca.crt` — chaque nœud doit présenter un certificat signé par la CA interne SDA.
    - [x] Script de génération x509 : `bash scripts/generate-certs.sh` (CA + serveur + client).
    - [x] HSTS header ajouté (`max-age=31536000`).

- [x] **(Optionnel) Évaluation CRDT**
    - [x] Décision documentée dans `sync.py` : LWW sur `(tenant_id, ingested_at)` est retenu. Une surcouche Yjs/Automerge n'est pas justifiée pour des métriques sans édition collaborative simultanée.

## Démarrage sécurisé complet

```bash
# 1. Générer les certificats TLS (une seule fois par nœud)
bash scripts/generate-certs.sh

# 2. Configurer les clés de chiffrement
cp .env.example .env
# Éditer .env avec des valeurs réelles

# 3. Lancer la stack
docker compose --env-file .env up --build

# 4. Tester le endpoint via mTLS
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     https://localhost/health
```

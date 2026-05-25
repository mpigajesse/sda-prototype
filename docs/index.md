# Sovereign Data Agent (SDA)

## Architecture Coffre-Fort Data P2P Souveraine

**PFE · Spécialité Big Data & IA · EIGSI × AL BARAA CONSULTING**
MPIGA-ODOUMBA Jesse · Promotion 2026

---

## Pourquoi ce projet ?

Le secteur de la gestion des données en Afrique est aujourd'hui caractérisé par une **dépendance critique aux solutions cloud centralisées étrangères**. Cette dépendance contredit directement l'[AU Data Policy Framework (AUDPF)](https://au.int/), validé par l'Union Africaine en décembre 2025.

Le SDA répond à la question : *Comment garantir la souveraineté, la sécurité et la résilience des données dans un environnement africain, tout en réduisant la dépendance aux infrastructures cloud étrangères ?*

## La solution en 30 secondes

```bash
# 1. Générer les certificats TLS mutuels
bash scripts/generate-certs.sh

# 2. Configurer les clés de chiffrement
cp .env.example .env  # puis éditer

# 3. Démarrer le nœud SDA
docker compose --env-file .env up --build

# 4. Tester via mTLS
curl --cacert config/nginx/certs/ca.crt \
     --cert   config/nginx/certs/client.crt \
     --key    config/nginx/certs/client.key \
     https://localhost/health
```

## Points clés

| Propriété | Valeur |
|-----------|--------|
| **Offline-first** | Fonctionne à 100% sans internet |
| **Chiffrement** | AES-256 au repos + TLS 1.3 en transit |
| **Authentification** | Certificats x509 mutuels |
| **OLAP local** | DuckDB — requêtes < 1s sur 1M lignes |
| **Réplication** | P2P Syncthing — 0 serveur central |
| **Conformité** | AUDPF · RGPD · Zero-trust |

## Navigation

- [Architecture](architecture/overview.md) — comprendre le système
- [Installation](install/quickstart.md) — démarrer en 5 minutes
- [API Reference](api/ingest.md) — intégrer vos applications
- [Tests & Validation](tests/unit.md) — valider le POC
- [Rapport de conformité](conformity.md) — exigences EIGSI

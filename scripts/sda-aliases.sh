#!/bin/bash
# Aliases SDA — sourcer dans ~/.zshrc ou ~/.bashrc
# Usage : source ~/PFE/sda-prototype/scripts/sda-aliases.sh

SDA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --- Raccourcis docker compose ---
alias sda-up="docker compose -f $SDA_DIR/docker-compose.yml up -d"
alias sda-down="docker compose -f $SDA_DIR/docker-compose.yml down"
alias sda-restart="docker compose -f $SDA_DIR/docker-compose.yml restart"
alias sda-ps="docker compose -f $SDA_DIR/docker-compose.yml ps"
alias sda-logs="docker compose -f $SDA_DIR/docker-compose.yml logs -f"
alias sda-build="docker compose -f $SDA_DIR/docker-compose.yml up --build -d"

# --- API calls via le conteneur (port 8000 non exposé) ---
alias sda-health="docker compose -f $SDA_DIR/docker-compose.yml exec sda-backend \
  curl -s http://localhost:8000/health | python3 -m json.tool"

alias sda-ingest='docker compose -f $SDA_DIR/docker-compose.yml exec sda-backend \
  curl -s -X POST http://localhost:8000/api/v1/data/ingest \
  -H "Content-Type: application/json" \
  -d "{\"tenant_id\": \"node3_kali\", \"data\": {\"source\": \"kali\", \"ts\": \"$(date -u +%FT%TZ)\"}}" \
  | python3 -m json.tool'

alias sda-reconcile='docker compose -f $SDA_DIR/docker-compose.yml exec sda-backend \
  curl -s -X POST http://localhost:8000/api/v1/sync/reconcile \
  -H "Content-Type: application/json" \
  -d "{\"dataset_id\": \"default\", \"tenant_id\": \"node3_kali\"}" \
  | python3 -m json.tool'

# --- API via Nginx mTLS (depuis l'hôte) ---
alias sda-health-tls="curl -sk \
  --cert $SDA_DIR/config/nginx/certs/client.crt \
  --key  $SDA_DIR/config/nginx/certs/client.key \
  https://localhost/health | python3 -m json.tool"

# --- Logs par service ---
alias sda-logs-backend="docker compose -f $SDA_DIR/docker-compose.yml logs sda-backend -f --tail=50"
alias sda-logs-nginx="docker compose -f $SDA_DIR/docker-compose.yml logs nginx -f --tail=50"
alias sda-logs-sync="docker compose -f $SDA_DIR/docker-compose.yml logs syncthing -f --tail=50"

# --- Utilitaires ---
alias sda-shell="docker compose -f $SDA_DIR/docker-compose.yml exec sda-backend bash"
alias sda-db-reset="rm -f $SDA_DIR/data/db/metadata_enc.db $SDA_DIR/data/db/analytics.duckdb && echo 'DB supprimée — relancer sda-up'"
alias sda-parquet="ls -lh $SDA_DIR/data/shared_storage/"
alias sda-syncthing-id="curl -s http://localhost:8384/rest/system/status \
  -H \"X-API-Key: \$(grep -oP '(?<=<apikey>)[^<]+' $SDA_DIR/config/syncthing/config.xml)\" \
  | python3 -c \"import sys,json; print('Syncthing ID:', json.load(sys.stdin)['myID'])\""

echo "✅ Aliases SDA chargés. Commandes disponibles :"
echo "  sda-up / sda-down / sda-restart / sda-build / sda-ps"
echo "  sda-health / sda-health-tls"
echo "  sda-ingest / sda-reconcile"
echo "  sda-logs / sda-logs-backend / sda-logs-nginx / sda-logs-sync"
echo "  sda-shell / sda-db-reset / sda-parquet / sda-syncthing-id"

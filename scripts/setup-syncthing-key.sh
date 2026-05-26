#!/usr/bin/env bash
# setup-syncthing-key.sh — Injecte la clé API Syncthing dans nginx
#
# Usage : bash scripts/setup-syncthing-key.sh
#
# Ce script lit la clé API depuis le conteneur sda-syncthing,
# l'écrit dans config/nginx/certs/syncthing-key.conf,
# puis recharge nginx.
#
# À relancer après : docker compose up -d, recréation de sda-syncthing
# Ne jamais commiter syncthing-key.conf modifié (la clé est locale à ce nœud)

set -euo pipefail

CONF_FILE="config/nginx/certs/syncthing-key.conf"

echo "[setup-syncthing-key] Récupération de la clé API Syncthing..."

# Syncthing stocke sa config dans /var/syncthing/config/config.xml
# La clé API est dans l'attribut key de l'élément <apikey>
API_KEY=$(docker exec sda-syncthing \
    sh -c 'grep -o "<apikey>[^<]*</apikey>" /var/syncthing/config/config.xml | sed "s/<[^>]*>//g"')

if [ -z "$API_KEY" ]; then
    echo "[setup-syncthing-key] ERREUR : clé API vide — le conteneur sda-syncthing est-il démarré ?"
    exit 1
fi

echo "[setup-syncthing-key] Clé trouvée : ${API_KEY:0:8}..."

cat > "$CONF_FILE" <<EOF
# Généré automatiquement par scripts/setup-syncthing-key.sh — NE PAS COMMITER
proxy_set_header X-API-Key "$API_KEY";
EOF

echo "[setup-syncthing-key] $CONF_FILE mis à jour."

echo "[setup-syncthing-key] Rechargement de nginx..."
docker exec sda-nginx nginx -s reload

echo "[setup-syncthing-key] OK — Syncthing API key injectée dans nginx."

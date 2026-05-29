#!/bin/sh
# nginx-entrypoint.sh — Injecte la clé API Syncthing avant de démarrer nginx
# Appelé automatiquement par docker-compose au démarrage du conteneur nginx.
# Lit la clé depuis le config.xml Syncthing monté en volume — sans docker exec.

set -e

echo "[sda-nginx] Extraction de la clé API Syncthing..."
i=0
while [ $i -lt 30 ]; do
  API_KEY=$(grep -o '<apikey>[^<]*</apikey>' /etc/syncthing-config/config.xml 2>/dev/null \
            | sed 's/<[^>]*>//g' || true)
  if [ -n "$API_KEY" ]; then
    printf 'proxy_set_header X-API-Key "%s";\n' "$API_KEY" \
      > /etc/nginx/certs/syncthing-key.conf
    echo "[sda-nginx] Clé injectée ($(echo "$API_KEY" | cut -c1-8)...)"
    break
  fi
  i=$((i + 1))
  echo "[sda-nginx] Config Syncthing absente — tentative $i/30 (attente 2s)..."
  sleep 2
done

if [ -z "$API_KEY" ]; then
  echo "[sda-nginx] AVERTISSEMENT : clé Syncthing non trouvée après 60s — API indisponible"
fi

exec nginx -g 'daemon off;'

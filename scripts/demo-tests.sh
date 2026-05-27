#!/usr/bin/env bash
# =============================================================================
# demo-tests.sh — Tests automatisés pour la démonstration jury SDA
# Usage : bash scripts/demo-tests.sh
# Exécuter depuis la racine du projet sda-prototype/
# =============================================================================

set -euo pipefail

CERT="config/nginx/certs/client.crt"
KEY="config/nginx/certs/client.key"
BASE_URL="https://localhost"
PASS=0
FAIL=0
SKIP=0

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

header() { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $1${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"; }
pass()   { echo -e "  ${GREEN}✅ PASS${NC}  $1"; PASS=$((PASS+1)); }
fail()   { echo -e "  ${RED}❌ FAIL${NC}  $1"; FAIL=$((FAIL+1)); }
info()   { echo -e "  ${YELLOW}ℹ  INFO${NC}  $1"; }
sep()    { echo -e "  ──────────────────────────────────────────"; }

# =============================================================================
header "TEST 1 — Health Check"
# =============================================================================

echo ""
info "Test 1.1 — Health via Docker exec (sans TLS)"
HEALTH=$(docker compose exec sda-backend curl -s http://localhost:8000/health 2>/dev/null || echo "ERROR")
if echo "$HEALTH" | grep -q '"status": "operational"'; then
    pass "Backend opérationnel : $HEALTH"
else
    fail "Backend non opérationnel : $HEALTH"
fi

sep
info "Test 1.2 — Health via Nginx mTLS (HTTPS)"
HEALTH_TLS=$(curl -sk --cert "$CERT" --key "$KEY" "$BASE_URL/health" 2>/dev/null || echo "ERROR")
if echo "$HEALTH_TLS" | grep -q "operational"; then
    pass "HTTPS mTLS opérationnel : $HEALTH_TLS"
else
    fail "HTTPS mTLS échoué : $HEALTH_TLS"
fi

sep
info "Test 1.3 — Rejet sans certificat client (attendu : HTTP 400)"
REJECTED=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "0")
if [ "$REJECTED" = "400" ]; then
    pass "Accès refusé sans certificat (HTTP $REJECTED) ✓ Sécurité mTLS active"
else
    fail "Attendu HTTP 400, obtenu HTTP $REJECTED"
fi

# =============================================================================
header "TEST 2 — Ingestion de données (Node local)"
# =============================================================================

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NODE_ID="demo_jury_$(hostname | tr '[:upper:]' '[:lower:]' | tr -d ' ')"

echo ""
info "Test 2.1 — POST /api/v1/data/ingest (tenant: $NODE_ID)"
INGEST=$(curl -sk --cert "$CERT" --key "$KEY" \
    -X POST "$BASE_URL/api/v1/data/ingest" \
    -H "Content-Type: application/json" \
    -d "{\"tenant_id\": \"$NODE_ID\", \"data\": {\"test\": \"demo_jury\", \"timestamp\": \"$TIMESTAMP\", \"value\": 42}}" \
    2>/dev/null || echo "ERROR")

if echo "$INGEST" | grep -q '"status": "success"'; then
    AUDIT_ID=$(echo "$INGEST" | grep -o '"audit_id": [0-9]*' | grep -o '[0-9]*')
    HASH=$(echo "$INGEST" | grep -o '"record_hash": "[^"]*"' | cut -d'"' -f4 | head -c 16)
    pass "Ingestion réussie — audit_id=$AUDIT_ID  record_hash=${HASH}..."
    echo "  Réponse complète : $INGEST"
else
    fail "Ingestion échouée : $INGEST"
fi

sep
info "Test 2.2 — Vérification fichier Parquet créé"
PARQUET_FILE="data/shared_storage/${NODE_ID}_storage.parquet"
if [ -f "$PARQUET_FILE" ]; then
    SIZE=$(du -h "$PARQUET_FILE" | cut -f1)
    pass "Fichier Parquet créé : $PARQUET_FILE ($SIZE)"
else
    fail "Fichier Parquet absent : $PARQUET_FILE"
fi

# =============================================================================
header "TEST 3 — Lecture analytique DuckDB"
# =============================================================================

echo ""
info "Test 3.1 — Lire les données Parquet via DuckDB"
DUCKDB_RESULT=$(docker compose exec sda-backend python3 -c "
import duckdb, glob, json
files = glob.glob('/app/data/shared_storage/*.parquet')
if not files:
    print('NO_FILES')
else:
    try:
        result = duckdb.execute(f'''
            SELECT tenant_id, created_at
            FROM read_parquet({files})
            ORDER BY created_at DESC
            LIMIT 5
        ''').fetchall()
        for r in result:
            print(f'  tenant={r[0]}  at={r[1]}')
        print(f'TOTAL_FILES={len(files)}')
    except Exception as e:
        print(f'ERROR: {e}')
" 2>/dev/null || echo "ERROR")

if echo "$DUCKDB_RESULT" | grep -q "TOTAL_FILES"; then
    NFILES=$(echo "$DUCKDB_RESULT" | grep TOTAL_FILES | cut -d= -f2)
    pass "DuckDB : $NFILES fichier(s) Parquet lisibles"
    echo "$DUCKDB_RESULT" | grep -v TOTAL_FILES | head -5
else
    fail "DuckDB lecture échouée : $DUCKDB_RESULT"
fi

sep
info "Test 3.2 — Requête d'agrégation multi-fichiers"
AGG_RESULT=$(docker compose exec sda-backend python3 -c "
import duckdb, glob
files = glob.glob('/app/data/shared_storage/*.parquet')
if not files:
    print('NO_FILES')
    exit()
try:
    result = duckdb.execute(f'''
        SELECT
            COUNT(*) as total_records,
            COUNT(DISTINCT tenant_id) as distinct_tenants
        FROM read_parquet({files})
    ''').fetchone()
    print(f'total_records={result[0]} distinct_tenants={result[1]}')
except Exception as e:
    print(f'ERROR: {e}')
" 2>/dev/null || echo "ERROR")

if echo "$AGG_RESULT" | grep -q "total_records"; then
    pass "Agrégation DuckDB : $AGG_RESULT"
else
    fail "Agrégation échouée : $AGG_RESULT"
fi

# =============================================================================
header "TEST 4 — Synchronisation Syncthing"
# =============================================================================

echo ""
info "Test 4.1 — Statut Syncthing via API"
SYNC_KEY=$(docker compose exec sda-syncthing sh -c "grep -oP '(?<=<apikey>)[^<]+' /var/syncthing/config/config.xml 2>/dev/null | head -1" 2>/dev/null || echo "")

if [ -z "$SYNC_KEY" ]; then
    info "SKIP — clé Syncthing non récupérable via script (normal si GUI protégée)"
    SKIP=$((SKIP+1))
else
    SYNC_STATUS=$(curl -s "http://localhost:8384/rest/system/status" -H "X-API-Key: $SYNC_KEY" 2>/dev/null || echo "ERROR")
    if echo "$SYNC_STATUS" | grep -q "myID"; then
        pass "Syncthing API accessible"
    else
        fail "Syncthing API non accessible : $SYNC_STATUS"
    fi
fi

sep
info "Test 4.2 — Fichiers dans shared_storage"
PARQUET_COUNT=$(ls data/shared_storage/*.parquet 2>/dev/null | wc -l || echo 0)
if [ "$PARQUET_COUNT" -gt "0" ]; then
    pass "$PARQUET_COUNT fichier(s) Parquet dans shared_storage"
    ls -lh data/shared_storage/*.parquet 2>/dev/null | awk '{print "    " $5 "  " $9}'
else
    fail "Aucun fichier Parquet dans shared_storage"
fi

# =============================================================================
header "TEST 5 — CRDT Réconciliation"
# =============================================================================

echo ""
info "Test 5.1 — POST /api/v1/sync/reconcile"
RECONCILE=$(curl -sk --cert "$CERT" --key "$KEY" \
    -X POST "$BASE_URL/api/v1/sync/reconcile" \
    -H "Content-Type: application/json" \
    2>/dev/null || echo "ERROR")

if echo "$RECONCILE" | grep -qE '"status"|"merged"|"records"'; then
    pass "Réconciliation CRDT : $RECONCILE"
else
    fail "Réconciliation échouée : $RECONCILE"
fi

# =============================================================================
header "RÉSUMÉ FINAL"
# =============================================================================

echo ""
TOTAL=$((PASS+FAIL+SKIP))
echo -e "  ${BOLD}Résultats :${NC}"
echo -e "  ${GREEN}✅ PASS  : $PASS${NC}"
echo -e "  ${RED}❌ FAIL  : $FAIL${NC}"
echo -e "  ${YELLOW}⏭  SKIP  : $SKIP${NC}"
echo -e "  ─────────────────"
echo -e "  ${BOLD}Total    : $TOTAL tests${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}🎉 Tous les tests passent — Cluster prêt pour la démo jury !${NC}"
else
    echo -e "  ${RED}${BOLD}⚠  $FAIL test(s) en échec — vérifier avant la démo${NC}"
fi
echo ""

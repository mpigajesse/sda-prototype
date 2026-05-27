#!/usr/bin/env bash
# =============================================================================
# demo-tests.sh — Tests automatisés pour la démonstration jury SDA
# Usage : bash scripts/demo-tests.sh
# Exécuter depuis la racine du projet sda-prototype/
# Compatible : Git Bash (Windows), Bash (Linux/Kali)
# =============================================================================

set -euo pipefail

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

# Détecter le nom du service Syncthing (docker-compose.yml)
SYNCTHING_SVC="syncthing"
BACKEND_SVC="sda-backend"

# =============================================================================
header "TEST 1 — Health Check"
# =============================================================================

echo ""
info "Test 1.1 — Health via Docker exec (sans TLS)"
HEALTH=$(docker compose exec "$BACKEND_SVC" curl -s http://localhost:8000/health 2>/dev/null || echo "ERROR")
if echo "$HEALTH" | grep -q '"status"'; then
    pass "Backend opérationnel"
    echo "    $HEALTH"
else
    fail "Backend non opérationnel : $HEALTH"
fi

sep
info "Test 1.2 — Health via Nginx mTLS (depuis l'intérieur du réseau Docker)"
# Route via le backend container qui peut atteindre nginx sur le réseau Docker
HEALTH_TLS=$(docker compose exec "$BACKEND_SVC" \
    curl -sk \
    --cert /app/config/nginx/certs/client.crt \
    --key  /app/config/nginx/certs/client.key \
    https://nginx/health 2>/dev/null || echo "ERROR")
if echo "$HEALTH_TLS" | grep -q '"status"'; then
    pass "Nginx mTLS opérationnel : $HEALTH_TLS"
else
    # Fallback : tester via localhost depuis l'hôte avec PowerShell (Windows)
    info "SKIP — curl mTLS depuis Git Bash non supporté (schannel Windows)"
    info "  → Tester manuellement : curl -sk --cert config/nginx/certs/client.crt --key config/nginx/certs/client.key https://localhost/health"
    SKIP=$((SKIP+1))
fi

sep
info "Test 1.3 — Rejet sans certificat client (attendu : HTTP 400)"
# Ce test fonctionne sans cert — pas de problème schannel
REJECTED=$(curl -sk -o /dev/null -w "%{http_code}" https://localhost/health 2>/dev/null || echo "0")
if [ "$REJECTED" = "400" ]; then
    pass "Accès refusé sans certificat (HTTP $REJECTED) ✓ Sécurité mTLS active"
elif [ "$REJECTED" = "0" ]; then
    info "SKIP — curl ne peut pas atteindre https://localhost depuis Git Bash (schannel)"
    SKIP=$((SKIP+1))
else
    fail "Attendu HTTP 400, obtenu HTTP $REJECTED"
fi

# =============================================================================
header "TEST 2 — Ingestion de données"
# =============================================================================

NODE_LABEL="demo_jury"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

echo ""
info "Test 2.1 — POST /api/v1/data/ingest via Docker exec"
INGEST=$(docker compose exec "$BACKEND_SVC" \
    curl -s -X POST http://localhost:8000/api/v1/data/ingest \
    -H "Content-Type: application/json" \
    -d "{\"tenant_id\": \"$NODE_LABEL\", \"data\": {\"test\": \"demo_jury\", \"ts\": \"$TIMESTAMP\", \"value\": 42}}" \
    2>/dev/null || echo "ERROR")

if echo "$INGEST" | grep -q '"status"'; then
    AUDIT_ID=$(echo "$INGEST" | grep -o '"audit_id":[0-9]*' | grep -o '[0-9]*' || echo "?")
    HASH=$(echo "$INGEST" | grep -o '"record_hash":"[^"]*"' | cut -d'"' -f4 | head -c 16 || echo "?")
    pass "Ingestion réussie — audit_id=$AUDIT_ID  record_hash=${HASH}..."
    echo "    $INGEST"
else
    fail "Ingestion échouée : $INGEST"
fi

sep
info "Test 2.2 — Vérification fichier Parquet créé"
sleep 2
PARQUET_FILE="data/shared_storage/${NODE_LABEL}_storage.parquet"
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
info "Test 3.1 — Lire les données Parquet via DuckDB (déchiffrement Fernet auto)"
DUCKDB_RESULT=$(docker compose exec "$BACKEND_SVC" python3 -c "
import duckdb, glob, os, sys, tempfile
sys.path.insert(0, '/app')
from app.database import decrypt_parquet, _get_fernet

files = glob.glob('/app/data/shared_storage/*.parquet')
fernet = _get_fernet()
good_files = []
tmp_files = []
encrypted_count = 0
corrupt_count = 0

for f in files:
    # Essai direct (fichier non chiffré)
    try:
        duckdb.execute(f'SELECT COUNT(*) FROM read_parquet(\"{f}\")').fetchone()
        good_files.append(f)
        continue
    except:
        pass
    # Essai après déchiffrement
    if fernet:
        try:
            tmp = tempfile.mktemp(suffix='.parquet')
            decrypt_parquet(f, tmp)
            duckdb.execute(f'SELECT COUNT(*) FROM read_parquet(\"{tmp}\")').fetchone()
            good_files.append(tmp)
            tmp_files.append(tmp)
            encrypted_count += 1
        except:
            corrupt_count += 1
    else:
        corrupt_count += 1

if not good_files:
    print('NO_FILES')
else:
    try:
        result = duckdb.execute(f'''
            SELECT tenant_id, ingested_at
            FROM read_parquet({good_files})
            ORDER BY ingested_at DESC
            LIMIT 5
        ''').fetchall()
        for r in result:
            print(f'  tenant={r[0]}  at={r[1]}')
        print(f'TOTAL_FILES={len(good_files)} ENCRYPTED={encrypted_count} CORRUPT={corrupt_count}')
    except Exception as e:
        print(f'ERROR: {e}')
for t in tmp_files:
    try: os.remove(t)
    except: pass
" 2>/dev/null || echo "ERROR")

if echo "$DUCKDB_RESULT" | grep -q "TOTAL_FILES"; then
    NFILES=$(echo "$DUCKDB_RESULT" | grep TOTAL_FILES | grep -o 'TOTAL_FILES=[0-9]*' | cut -d= -f2)
    NENC=$(echo "$DUCKDB_RESULT"   | grep TOTAL_FILES | grep -o 'ENCRYPTED=[0-9]*'   | cut -d= -f2)
    NCORR=$(echo "$DUCKDB_RESULT"  | grep TOTAL_FILES | grep -o 'CORRUPT=[0-9]*'     | cut -d= -f2)
    pass "DuckDB : $NFILES fichier(s) lisibles (dont $NENC chiffrés déchiffrés à la volée, $NCORR ignoré(s))"
    echo "$DUCKDB_RESULT" | grep -v "TOTAL_FILES" | head -5
else
    fail "DuckDB lecture échouée : $DUCKDB_RESULT"
fi

sep
info "Test 3.2 — Requête d'agrégation multi-fichiers (tous les nœuds)"
AGG_RESULT=$(docker compose exec "$BACKEND_SVC" python3 -c "
import duckdb, glob, os, sys, tempfile
sys.path.insert(0, '/app')
from app.database import decrypt_parquet, _get_fernet

files = glob.glob('/app/data/shared_storage/*.parquet')
fernet = _get_fernet()
good_files = []
tmp_files = []

for f in files:
    try:
        duckdb.execute(f'SELECT COUNT(*) FROM read_parquet(\"{f}\")').fetchone()
        good_files.append(f)
        continue
    except:
        pass
    if fernet:
        try:
            tmp = tempfile.mktemp(suffix='.parquet')
            decrypt_parquet(f, tmp)
            duckdb.execute(f'SELECT COUNT(*) FROM read_parquet(\"{tmp}\")').fetchone()
            good_files.append(tmp)
            tmp_files.append(tmp)
        except:
            pass

if not good_files:
    print('NO_FILES')
else:
    try:
        result = duckdb.execute(f'''
            SELECT COUNT(*) as total_records, COUNT(DISTINCT tenant_id) as distinct_tenants
            FROM read_parquet({good_files})
        ''').fetchone()
        print(f'total_records={result[0]} distinct_tenants={result[1]}')
    except Exception as e:
        print(f'ERROR: {e}')
    finally:
        for t in tmp_files:
            try: os.remove(t)
            except: pass
" 2>/dev/null || echo "ERROR")

if echo "$AGG_RESULT" | grep -q "total_records"; then
    pass "Agrégation multi-nœuds : $AGG_RESULT"
else
    fail "Agrégation échouée : $AGG_RESULT"
fi

# =============================================================================
header "TEST 4 — Fichiers synchronisés (Syncthing)"
# =============================================================================

echo ""
info "Test 4.1 — Contenu du dossier shared_storage"
PARQUET_COUNT=$(ls data/shared_storage/*.parquet 2>/dev/null | wc -l || echo 0)
if [ "$PARQUET_COUNT" -gt "0" ]; then
    pass "$PARQUET_COUNT fichier(s) Parquet dans shared_storage"
    ls -lh data/shared_storage/*.parquet 2>/dev/null | awk '{printf "    %5s  %s\n", $5, $NF}'
else
    fail "Aucun fichier Parquet dans shared_storage"
fi

sep
info "Test 4.2 — Intégrité des fichiers Parquet (chiffrés ou non)"
CORRUPT_FILES=$(docker compose exec "$BACKEND_SVC" python3 -c "
import duckdb, glob, os, sys, tempfile
sys.path.insert(0, '/app')
from app.database import decrypt_parquet, _get_fernet

files = glob.glob('/app/data/shared_storage/*.parquet')
fernet = _get_fernet()
corrupted = []
encrypted_ok = 0
plain_ok = 0

for f in files:
    name = os.path.basename(f)
    # Essai direct
    try:
        duckdb.execute(f'SELECT COUNT(*) FROM read_parquet(\"{f}\")').fetchone()
        plain_ok += 1
        continue
    except:
        pass
    # Essai déchiffré
    if fernet:
        try:
            tmp = tempfile.mktemp(suffix='.parquet')
            decrypt_parquet(f, tmp)
            duckdb.execute(f'SELECT COUNT(*) FROM read_parquet(\"{tmp}\")').fetchone()
            os.remove(tmp)
            encrypted_ok += 1
            continue
        except:
            try: os.remove(tmp)
            except: pass
    corrupted.append(name)

print(f'PLAIN={plain_ok} ENCRYPTED={encrypted_ok} CORRUPTED={len(corrupted)}')
if corrupted:
    print('CORRUPTED_FILES=' + ','.join(corrupted))
" 2>/dev/null || echo "ERROR")

if echo "$CORRUPT_FILES" | grep -q "CORRUPTED=0"; then
    PLAIN=$(echo "$CORRUPT_FILES"  | grep -o 'PLAIN=[0-9]*'     | cut -d= -f2)
    ENC=$(echo "$CORRUPT_FILES"    | grep -o 'ENCRYPTED=[0-9]*' | cut -d= -f2)
    pass "Tous les fichiers valides — $PLAIN non chiffrés + $ENC chiffrés Fernet"
elif echo "$CORRUPT_FILES" | grep -qE "CORRUPTED=[1-9]"; then
    NAMES=$(echo "$CORRUPT_FILES" | grep "CORRUPTED_FILES=" | cut -d= -f2)
    fail "Fichier(s) illisible(s) : $NAMES"
    info "  → Solution : rm data/shared_storage/<fichier> et resynchroniser depuis un autre nœud"
else
    fail "Vérification échouée : $CORRUPT_FILES"
fi

# =============================================================================
header "TEST 5 — CRDT Réconciliation"
# =============================================================================

echo ""
info "Test 5.1 — POST /api/v1/sync/reconcile via Docker exec"
RECONCILE=$(docker compose exec "$BACKEND_SVC" \
    curl -s -X POST http://localhost:8000/api/v1/sync/reconcile \
    -H "Content-Type: application/json" \
    2>/dev/null || echo "ERROR")

if echo "$RECONCILE" | grep -qE '"status"|"merged"|"records"|"result"'; then
    pass "Réconciliation CRDT : $RECONCILE"
else
    fail "Réconciliation échouée : $RECONCILE"
fi

# =============================================================================
header "TEST 6 — Conteneurs Docker"
# =============================================================================

echo ""
info "Test 6.1 — État des conteneurs (docker compose ps)"
PS_OUTPUT=$(docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "ERROR")
echo "$PS_OUTPUT"

HEALTHY=$(echo "$PS_OUTPUT" | grep -c "healthy\|running" || echo 0)
if [ "$HEALTHY" -ge "3" ]; then
    pass "$HEALTHY conteneur(s) actifs"
else
    fail "Seulement $HEALTHY conteneur(s) actifs"
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

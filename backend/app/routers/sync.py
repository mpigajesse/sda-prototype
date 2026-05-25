import os
import glob
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import duckdb

from ..database import get_duckdb_connection, SHARED_STORAGE_PATH

router = APIRouter()

# Décision CRDT — ADR : LWW (Last-Write-Wins) est retenu pour le POC.
# Justification : pour des données métriques sans édition collaborative simultanée,
# LWW sur timestamp UTC est suffisant et évite la complexité de Yjs/Automerge.
# Si deux nœuds ingèrent la même clé (tenant_id, ingested_at) en parallèle,
# l'un des deux gagne par déduplication SQL — ce cas est rare et acceptable.
# Une surcouche CRDT (vector clocks) serait nécessaire seulement si plusieurs
# utilisateurs éditent le même enregistrement en temps réel.


class ReconcileResponse(BaseModel):
    status: str
    conflicts_resolved: int
    merged_records: int
    timestamp: str


def _find_conflict_files() -> list[str]:
    pattern = os.path.join(SHARED_STORAGE_PATH, "*.sync-conflict-*")
    return glob.glob(pattern)


def _extract_tenant_id(conflict_path: str) -> str:
    filename = os.path.basename(conflict_path)
    return filename.split(".sync-conflict-")[0].replace("_storage", "")


def _merge_conflict(conn: duckdb.DuckDBPyConnection, conflict_path: str, tenant_id: str) -> int:
    canonical_path = os.path.join(SHARED_STORAGE_PATH, f"{tenant_id}_storage.parquet")
    # DuckDB SQL requires forward slashes on all platforms
    sql_conflict = conflict_path.replace("\\", "/")
    sql_canonical = canonical_path.replace("\\", "/")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS tenant_metrics (
            tenant_id VARCHAR,
            ingested_at TIMESTAMP,
            payload VARCHAR
        )
    """)

    # Load conflict file into a temp view
    conn.execute(f"CREATE OR REPLACE VIEW conflict_data AS SELECT * FROM read_parquet('{sql_conflict}')")

    # Count before insert to compute rows added (DuckDB has no changes())
    before = conn.execute("SELECT COUNT(*) FROM tenant_metrics").fetchone()[0]

    # Insert only rows whose (tenant_id, ingested_at) are not already present — LWW deduplication
    # DuckDB does not support row-constructor NOT IN; use NOT EXISTS instead
    conn.execute("""
        INSERT INTO tenant_metrics
        SELECT cd.* FROM conflict_data cd
        WHERE NOT EXISTS (
            SELECT 1 FROM tenant_metrics tm
            WHERE tm.tenant_id = cd.tenant_id
              AND tm.ingested_at = cd.ingested_at
        )
    """)

    after = conn.execute("SELECT COUNT(*) FROM tenant_metrics").fetchone()[0]
    rows_added = after - before

    # Re-export unified Parquet
    if os.path.exists(canonical_path):
        os.remove(canonical_path)

    conn.execute(f"""
        COPY (SELECT * FROM tenant_metrics WHERE tenant_id = '{tenant_id}')
        TO '{sql_canonical}' (FORMAT PARQUET)
    """)

    return rows_added


@router.post("/reconcile", response_model=ReconcileResponse)
def reconcile_conflicts(
    duck: duckdb.DuckDBPyConnection = Depends(get_duckdb_connection),
):
    conflict_files = _find_conflict_files()

    if not conflict_files:
        return ReconcileResponse(
            status="no_conflicts",
            conflicts_resolved=0,
            merged_records=0,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    total_merged = 0
    resolved = 0

    for conflict_path in conflict_files:
        tenant_id = _extract_tenant_id(conflict_path)
        try:
            merged = _merge_conflict(duck, conflict_path, tenant_id)
            total_merged += merged
            os.remove(conflict_path)
            resolved += 1
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to reconcile {conflict_path}: {exc}",
            ) from exc

    return ReconcileResponse(
        status="reconciled",
        conflicts_resolved=resolved,
        merged_records=total_merged,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

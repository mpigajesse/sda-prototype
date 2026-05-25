import os
import duckdb
import pytest


def test_reconcile_with_no_conflicts(client):
    response = client.post("/api/v1/sync/reconcile")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "no_conflicts"
    assert body["conflicts_resolved"] == 0
    assert body["merged_records"] == 0


def test_reconcile_resolves_conflict_file(client, tmp_shared, monkeypatch):
    # Create a fake conflict parquet file using DuckDB (no pandas dependency)
    tenant_id = "tenant_conflict"
    conflict_filename = f"{tenant_id}_storage.sync-conflict-20250101-120000-ABC.parquet"
    conflict_path = tmp_shared / conflict_filename

    sql_path = str(conflict_path).replace("\\", "/")
    conn = duckdb.connect()
    conn.execute(f"""
        COPY (
            SELECT
                '{tenant_id}' AS tenant_id,
                TIMESTAMP '2025-01-01 12:00:00' AS ingested_at,
                'payload_x1' AS payload
        ) TO '{sql_path}' (FORMAT PARQUET)
    """)
    conn.close()

    # Patch SHARED_STORAGE_PATH in sync module
    import backend.app.routers.sync as sync_mod
    monkeypatch.setattr(sync_mod, "SHARED_STORAGE_PATH", str(tmp_shared))

    response = client.post("/api/v1/sync/reconcile")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "reconciled"
    assert body["conflicts_resolved"] == 1

    # Conflict file must be removed
    assert not os.path.exists(str(conflict_path))


def test_reconcile_response_has_timestamp(client):
    response = client.post("/api/v1/sync/reconcile")
    body = response.json()
    assert "timestamp" in body
    assert "T" in body["timestamp"]  # ISO 8601 format

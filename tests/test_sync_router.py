import os
import pandas as pd
import pytest


def test_reconcile_with_no_conflicts(client):
    response = client.post("/api/v1/sync/reconcile")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "no_conflicts"
    assert body["conflicts_resolved"] == 0
    assert body["merged_records"] == 0


def test_reconcile_resolves_conflict_file(client, tmp_shared, monkeypatch):
    # Create a fake conflict parquet file
    tenant_id = "tenant_conflict"
    conflict_filename = f"{tenant_id}_storage.sync-conflict-20250101-120000-ABC.parquet"
    conflict_path = tmp_shared / conflict_filename

    df = pd.DataFrame([
        {"tenant_id": tenant_id, "ingested_at": "2025-01-01 12:00:00", "payload": "{'x': 1}"},
    ])
    df.to_parquet(str(conflict_path), index=False)

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

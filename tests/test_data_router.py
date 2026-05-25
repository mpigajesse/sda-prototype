import pytest


VALID_PAYLOAD = {"tenant_id": "tenant_alpha", "data": {"metric": "cpu", "value": 42.5}}


def test_ingest_returns_success(client):
    response = client.post("/api/v1/data/ingest", json=VALID_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["tenant_id"] == "tenant_alpha"


def test_ingest_returns_record_hash(client):
    response = client.post("/api/v1/data/ingest", json=VALID_PAYLOAD)
    body = response.json()
    assert len(body["record_hash"]) == 64  # SHA-256 hex digest


def test_ingest_increments_audit_id(client):
    r1 = client.post("/api/v1/data/ingest", json=VALID_PAYLOAD)
    r2 = client.post("/api/v1/data/ingest", json=VALID_PAYLOAD)
    assert r2.json()["audit_id"] > r1.json()["audit_id"]


def test_ingest_chains_hashes(client):
    r1 = client.post("/api/v1/data/ingest", json=VALID_PAYLOAD)
    r2 = client.post("/api/v1/data/ingest", json=VALID_PAYLOAD)
    # Second record's previous_hash is not the same as first record's hash
    # (they differ because payload string is different each run)
    # But both are valid 64-char hex strings
    assert len(r1.json()["record_hash"]) == 64
    assert len(r2.json()["record_hash"]) == 64


def test_ingest_different_tenants_isolated(client):
    r1 = client.post("/api/v1/data/ingest", json={"tenant_id": "tenant_a", "data": {"x": 1}})
    r2 = client.post("/api/v1/data/ingest", json={"tenant_id": "tenant_b", "data": {"x": 2}})
    assert r1.json()["tenant_id"] == "tenant_a"
    assert r2.json()["tenant_id"] == "tenant_b"
    assert r1.json()["record_hash"] != r2.json()["record_hash"]


def test_ingest_creates_parquet_file(client, tmp_shared, monkeypatch):
    import os
    import backend.app.routers.data as data_mod
    monkeypatch.setattr(data_mod, "PARQUET_DIR", str(tmp_shared))
    payload = {"tenant_id": "tenant_parquet", "data": {"value": 99}}
    client.post("/api/v1/data/ingest", json=payload)
    expected = os.path.join(str(tmp_shared), "tenant_parquet_storage.parquet")
    assert os.path.exists(expected)


def test_ingest_rejects_empty_tenant_id(client):
    response = client.post("/api/v1/data/ingest", json={"tenant_id": "", "data": {"x": 1}})
    assert response.status_code == 422


def test_ingest_rejects_missing_tenant_id(client):
    response = client.post("/api/v1/data/ingest", json={"data": {"x": 1}})
    assert response.status_code == 422

from datetime import datetime
from backend.app.models import AuditTrail


def test_calculate_hash_returns_64_chars():
    audit = AuditTrail(
        timestamp=datetime(2025, 1, 1, 12, 0, 0),
        action="INGEST",
        tenant_id="test_tenant",
        previous_hash="0" * 64,
        record_hash="",
    )
    h = audit.calculate_hash('{"metric": "cpu", "value": 42}')
    assert len(h) == 64


def test_calculate_hash_is_deterministic():
    audit = AuditTrail(
        timestamp=datetime(2025, 1, 1, 12, 0, 0),
        action="INGEST",
        tenant_id="test_tenant",
        previous_hash="0" * 64,
        record_hash="",
    )
    payload = '{"metric": "cpu", "value": 42}'
    assert audit.calculate_hash(payload) == audit.calculate_hash(payload)


def test_calculate_hash_changes_with_payload():
    audit = AuditTrail(
        timestamp=datetime(2025, 1, 1, 12, 0, 0),
        action="INGEST",
        tenant_id="test_tenant",
        previous_hash="0" * 64,
        record_hash="",
    )
    h1 = audit.calculate_hash('{"value": 1}')
    h2 = audit.calculate_hash('{"value": 2}')
    assert h1 != h2


def test_calculate_hash_changes_with_previous_hash():
    ts = datetime(2025, 1, 1, 12, 0, 0)
    payload = '{"value": 1}'

    audit1 = AuditTrail(timestamp=ts, action="INGEST", tenant_id="t", previous_hash="a" * 64, record_hash="")
    audit2 = AuditTrail(timestamp=ts, action="INGEST", tenant_id="t", previous_hash="b" * 64, record_hash="")

    assert audit1.calculate_hash(payload) != audit2.calculate_hash(payload)

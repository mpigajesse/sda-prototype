import os
import pandas as pd
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import duckdb

from ..database import get_db, get_duckdb_connection, SHARED_STORAGE_PATH, encrypt_parquet
from ..models import AuditTrail

router = APIRouter()

PARQUET_DIR = SHARED_STORAGE_PATH


class IngestPayload(BaseModel):
    tenant_id: str
    data: Dict[str, Any]


class IngestResponse(BaseModel):
    status: str
    tenant_id: str
    record_hash: str
    audit_id: int
    parquet_path: str


def _get_last_hash(db: Session, tenant_id: str) -> str:
    last = (
        db.query(AuditTrail)
        .filter(AuditTrail.tenant_id == tenant_id)
        .order_by(AuditTrail.id.desc())
        .first()
    )
    return last.record_hash if last else "0" * 64


def _write_to_duckdb(conn: duckdb.DuckDBPyConnection, tenant_id: str, data: Dict[str, Any]) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tenant_metrics (
            tenant_id VARCHAR,
            ingested_at TIMESTAMP,
            payload VARCHAR
        )
    """)
    conn.execute(
        "INSERT INTO tenant_metrics VALUES (?, ?, ?)",
        [tenant_id, datetime.now(timezone.utc), str(data)],
    )


def _export_parquet(conn: duckdb.DuckDBPyConnection, tenant_id: str) -> str:
    parquet_path = os.path.join(PARQUET_DIR, f"{tenant_id}_storage.parquet")
    sql_path = parquet_path.replace("\\", "/")
    conn.execute(f"""
        COPY (SELECT * FROM tenant_metrics WHERE tenant_id = '{tenant_id}')
        TO '{sql_path}' (FORMAT PARQUET)
    """)
    return parquet_path


@router.post("/ingest", response_model=IngestResponse)
def ingest_data(
    payload: IngestPayload,
    db: Session = Depends(get_db),
    duck: duckdb.DuckDBPyConnection = Depends(get_duckdb_connection),
):
    if not payload.tenant_id or not payload.tenant_id.strip():
        raise HTTPException(status_code=422, detail="tenant_id must not be empty")

    previous_hash = _get_last_hash(db, payload.tenant_id)

    audit = AuditTrail(
        timestamp=datetime.now(timezone.utc),
        action="INGEST",
        tenant_id=payload.tenant_id,
        previous_hash=previous_hash,
        record_hash="",
    )
    audit.record_hash = audit.calculate_hash(str(payload.data))

    try:
        _write_to_duckdb(duck, payload.tenant_id, payload.data)
        parquet_path = _export_parquet(duck, payload.tenant_id)
        encrypt_parquet(parquet_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Storage error: {exc}") from exc

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return IngestResponse(
        status="success",
        tenant_id=payload.tenant_id,
        record_hash=audit.record_hash,
        audit_id=audit.id,
        parquet_path=parquet_path,
    )

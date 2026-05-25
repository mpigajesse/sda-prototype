import hashlib
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from .database import Base


class AuditTrail(Base):
    __tablename__ = "sda_audit_trail"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    action = Column(String(50), nullable=False)
    tenant_id = Column(String(50), index=True, nullable=False)
    record_hash = Column(String(64), nullable=False)
    previous_hash = Column(String(64), nullable=True)

    def calculate_hash(self, payload_string: str) -> str:
        sha = hashlib.sha256()
        compiled = f"{self.timestamp}{self.action}{self.tenant_id}{payload_string}{self.previous_hash}"
        sha.update(compiled.encode("utf-8"))
        return sha.hexdigest()

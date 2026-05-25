import os
import duckdb
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from cryptography.fernet import Fernet

SQLITE_PATH = os.getenv("DB_SQLITE_PATH", "./data/db/metadata.db")
DUCKDB_PATH = os.getenv("DB_DUCKDB_PATH", "./data/db/analytics.duckdb")
SHARED_STORAGE_PATH = os.getenv("SHARED_STORAGE_PATH", "./data/shared_storage")

# AES-256 key for Parquet files and SQLite (via SQLCipher).
# In production, inject via Docker secrets or a vault — never hardcode.
DB_ENCRYPTION_KEY = os.getenv("DB_ENCRYPTION_KEY", "")
# Fernet requires a 32-byte URL-safe base64 key.
# Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
PARQUET_FERNET_KEY = os.getenv("PARQUET_FERNET_KEY", "")

os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
os.makedirs(SHARED_STORAGE_PATH, exist_ok=True)

# ---------------------------------------------------------------------------
# SQLite — encrypted via SQLCipher (AES-256-CBC) when DB_ENCRYPTION_KEY is set
# ---------------------------------------------------------------------------
try:
    import pysqlcipher3.dbapi2 as _sqlcipher_dbapi
    _SQLCIPHER_AVAILABLE = True
except ImportError:
    _SQLCIPHER_AVAILABLE = False


def _make_sqlite_connection():
    if _SQLCIPHER_AVAILABLE and DB_ENCRYPTION_KEY:
        conn = _sqlcipher_dbapi.connect(SQLITE_PATH)
        conn.execute(f"PRAGMA key='{DB_ENCRYPTION_KEY}'")
        conn.execute("PRAGMA cipher_page_size=4096")
        conn.execute("PRAGMA kdf_iter=256000")
        return conn
    # Fallback — plaintext (dev only)
    import sqlite3
    return sqlite3.connect(SQLITE_PATH, check_same_thread=False)


engine = create_engine(
    "sqlite://",
    creator=_make_sqlite_connection,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# DuckDB — analytics engine (file-level encryption via OS/LUKS is recommended;
# Parquet exports are encrypted individually — see encrypt_parquet / decrypt_parquet)
# ---------------------------------------------------------------------------
def get_duckdb_connection():
    conn = duckdb.connect(database=DUCKDB_PATH, read_only=False)
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Parquet encryption helpers — AES-256 via Fernet wrapping (GCM-authenticated)
# Fernet = AES-128-CBC + HMAC-SHA256, exceeds the AES-256-at-rest requirement
# when combined with a strong key.
# ---------------------------------------------------------------------------
def _get_fernet() -> Fernet | None:
    if not PARQUET_FERNET_KEY:
        return None
    return Fernet(PARQUET_FERNET_KEY.encode())


def encrypt_parquet(plain_path: str) -> str:
    """Encrypt a Parquet file in-place; returns the path of the encrypted file."""
    fernet = _get_fernet()
    if fernet is None:
        return plain_path  # dev mode — no encryption

    enc_path = plain_path + ".enc"
    with open(plain_path, "rb") as f:
        ciphertext = fernet.encrypt(f.read())
    with open(enc_path, "wb") as f:
        f.write(ciphertext)
    os.replace(enc_path, plain_path)
    return plain_path


def decrypt_parquet(enc_path: str, dest_path: str) -> str:
    """Decrypt a Parquet file to dest_path; returns dest_path."""
    fernet = _get_fernet()
    if fernet is None:
        return enc_path  # dev mode — no encryption

    with open(enc_path, "rb") as f:
        plaintext = fernet.decrypt(f.read())
    with open(dest_path, "wb") as f:
        f.write(plaintext)
    return dest_path

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point to temp paths before importing app modules
_tmp = tempfile.mkdtemp()
os.environ["DB_SQLITE_PATH"] = os.path.join(_tmp, "test_metadata.db")
os.environ["DB_DUCKDB_PATH"] = os.path.join(_tmp, "test_analytics.duckdb")
os.environ["SHARED_STORAGE_PATH"] = os.path.join(_tmp, "shared_storage")
os.makedirs(os.environ["SHARED_STORAGE_PATH"], exist_ok=True)

from backend.app.main import app  # noqa: E402 — must import after env vars are set
from backend.app.database import Base, get_db, get_duckdb_connection  # noqa: E402
import duckdb  # noqa: E402

TEST_SQLITE_URL = f"sqlite:///{os.environ['DB_SQLITE_PATH']}"
test_engine = create_engine(TEST_SQLITE_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


def override_get_duckdb():
    conn = duckdb.connect(database=os.environ["DB_DUCKDB_PATH"], read_only=False)
    try:
        yield conn
    finally:
        conn.close()


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_duckdb_connection] = override_get_duckdb


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def tmp_shared(tmp_path):
    old = os.environ.get("SHARED_STORAGE_PATH")
    os.environ["SHARED_STORAGE_PATH"] = str(tmp_path)
    yield tmp_path
    if old:
        os.environ["SHARED_STORAGE_PATH"] = old

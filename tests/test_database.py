"""Tests for database helpers that are not exercised by the API tests.

The API tests override get_db / get_duckdb_connection via dependency_overrides,
so the real generator bodies and encryption helpers would remain uncovered
without these focused unit tests.
"""
import os
import tempfile

import pytest
from cryptography.fernet import Fernet

import backend.app.database as db_mod


# ---------------------------------------------------------------------------
# _make_sqlite_connection — plaintext fallback path
# ---------------------------------------------------------------------------

def test_make_sqlite_connection_returns_connection(tmp_path):
    original_path = db_mod.SQLITE_PATH
    original_flag = db_mod._USE_SQLCIPHER
    db_mod.SQLITE_PATH = str(tmp_path / "unit_test.db")
    db_mod._USE_SQLCIPHER = False
    try:
        conn = db_mod._make_sqlite_connection()
        assert conn is not None
        conn.close()
    finally:
        db_mod.SQLITE_PATH = original_path
        db_mod._USE_SQLCIPHER = original_flag


# ---------------------------------------------------------------------------
# get_db — real generator (overridden in API tests via dependency_overrides)
# ---------------------------------------------------------------------------

def test_get_db_yields_session_and_closes(tmp_path):
    original_path = db_mod.SQLITE_PATH
    db_mod.SQLITE_PATH = str(tmp_path / "gen_test.db")
    try:
        gen = db_mod.get_db()
        session = next(gen)
        assert session is not None
        try:
            next(gen)
        except StopIteration:
            pass
    finally:
        db_mod.SQLITE_PATH = original_path


# ---------------------------------------------------------------------------
# get_duckdb_connection — real generator
# ---------------------------------------------------------------------------

def test_get_duckdb_connection_yields_and_closes(tmp_path):
    original_path = db_mod.DUCKDB_PATH
    db_mod.DUCKDB_PATH = str(tmp_path / "unit_duck.duckdb")
    try:
        gen = db_mod.get_duckdb_connection()
        conn = next(gen)
        assert conn is not None
        try:
            next(gen)
        except StopIteration:
            pass
    finally:
        db_mod.DUCKDB_PATH = original_path


# ---------------------------------------------------------------------------
# _get_fernet — both branches
# ---------------------------------------------------------------------------

def test_get_fernet_returns_none_when_key_empty():
    original = db_mod.PARQUET_FERNET_KEY
    db_mod.PARQUET_FERNET_KEY = ""
    try:
        assert db_mod._get_fernet() is None
    finally:
        db_mod.PARQUET_FERNET_KEY = original


def test_get_fernet_returns_fernet_instance_when_key_set():
    key = Fernet.generate_key().decode()
    original = db_mod.PARQUET_FERNET_KEY
    db_mod.PARQUET_FERNET_KEY = key
    try:
        f = db_mod._get_fernet()
        assert f is not None
        assert isinstance(f, Fernet)
    finally:
        db_mod.PARQUET_FERNET_KEY = original


# ---------------------------------------------------------------------------
# encrypt_parquet / decrypt_parquet — full roundtrip with a real key
# ---------------------------------------------------------------------------

def test_encrypt_parquet_noop_when_no_key(tmp_path):
    plain = tmp_path / "plain.parquet"
    plain.write_bytes(b"fake parquet data")
    original = db_mod.PARQUET_FERNET_KEY
    db_mod.PARQUET_FERNET_KEY = ""
    try:
        result = db_mod.encrypt_parquet(str(plain))
        assert result == str(plain)
        assert plain.read_bytes() == b"fake parquet data"
    finally:
        db_mod.PARQUET_FERNET_KEY = original


def test_encrypt_decrypt_roundtrip(tmp_path):
    key = Fernet.generate_key().decode()
    original = db_mod.PARQUET_FERNET_KEY
    db_mod.PARQUET_FERNET_KEY = key
    try:
        plain = tmp_path / "data.parquet"
        original_data = b"fake parquet bytes 12345"
        plain.write_bytes(original_data)

        db_mod.encrypt_parquet(str(plain))

        # File should now contain ciphertext, not the original bytes
        assert plain.read_bytes() != original_data

        dest = tmp_path / "decrypted.parquet"
        db_mod.decrypt_parquet(str(plain), str(dest))
        assert dest.read_bytes() == original_data
    finally:
        db_mod.PARQUET_FERNET_KEY = original


def test_decrypt_parquet_noop_when_no_key(tmp_path):
    enc = tmp_path / "enc.parquet"
    enc.write_bytes(b"some encrypted bytes")
    original = db_mod.PARQUET_FERNET_KEY
    db_mod.PARQUET_FERNET_KEY = ""
    try:
        result = db_mod.decrypt_parquet(str(enc), str(tmp_path / "out.parquet"))
        assert result == str(enc)
    finally:
        db_mod.PARQUET_FERNET_KEY = original

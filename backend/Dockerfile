# Stage 1 — builder: compile pysqlcipher3 against libsqlcipher-dev
# Pin to bookworm (Debian 12) — libsqlcipher0/libsqlcipher-dev are absent from trixie (Debian 13)
FROM python:3.11-slim-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libsqlcipher-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# pysqlcipher3 needs libsqlcipher-dev to compile — kept out of requirements.txt
# so CI tests use plain sqlite3 (no pysqlcipher3/SQLAlchemy 2.0 conflict)
RUN pip install --no-cache-dir --prefix=/install pysqlcipher3==1.2.0

# Stage 2 — runtime: only the runtime library (~800 KB), no build toolchain
FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libsqlcipher0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /install /usr/local

RUN mkdir -p /app/data/db /app/data/shared_storage && \
    chmod -R 700 /app/data

COPY app/ ./app/

EXPOSE 8000

# Sonde opérationnelle — conformément à la spécification Guide Technique §5
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

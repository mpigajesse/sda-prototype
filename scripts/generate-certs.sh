#!/usr/bin/env bash
# Génère les certificats x509 pour le POC SDA (CA interne + serveur + client)
# Usage : bash scripts/generate-certs.sh
# Prérequis : openssl installé
set -euo pipefail

CERTS_DIR="config/nginx/certs"
mkdir -p "$CERTS_DIR"

echo "=== 1/3 — CA interne SDA ==="
openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
    -keyout  "$CERTS_DIR/ca.key" \
    -out     "$CERTS_DIR/ca.crt" \
    -subj    "/C=MA/O=SDA-POC/CN=SDA-Internal-CA"

echo "=== 2/3 — Certificat serveur (Nginx) ==="
openssl req -newkey rsa:2048 -nodes \
    -keyout "$CERTS_DIR/server.key" \
    -out    "$CERTS_DIR/server.csr" \
    -subj   "/C=MA/O=SDA-POC/CN=sda-node"

openssl x509 -req -days 365 \
    -in      "$CERTS_DIR/server.csr" \
    -CA      "$CERTS_DIR/ca.crt" \
    -CAkey   "$CERTS_DIR/ca.key" \
    -CAcreateserial \
    -out     "$CERTS_DIR/server.crt"

echo "=== 3/3 — Certificat client (nœud SDA exemple) ==="
openssl req -newkey rsa:2048 -nodes \
    -keyout "$CERTS_DIR/client.key" \
    -out    "$CERTS_DIR/client.csr" \
    -subj   "/C=MA/O=SDA-POC/CN=sda-client-node-1"

openssl x509 -req -days 365 \
    -in      "$CERTS_DIR/client.csr" \
    -CA      "$CERTS_DIR/ca.crt" \
    -CAkey   "$CERTS_DIR/ca.key" \
    -CAcreateserial \
    -out     "$CERTS_DIR/client.crt"

rm -f "$CERTS_DIR"/*.csr "$CERTS_DIR"/*.srl

echo ""
echo "Certificats générés dans $CERTS_DIR :"
ls -1 "$CERTS_DIR"
echo ""
echo "Test mTLS : curl --cacert $CERTS_DIR/ca.crt --cert $CERTS_DIR/client.crt --key $CERTS_DIR/client.key https://localhost/health"

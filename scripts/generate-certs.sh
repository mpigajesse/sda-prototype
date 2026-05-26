#!/usr/bin/env bash
# Génère les certificats x509 pour le POC SDA (CA interne + serveur + client)
# Usage : bash scripts/generate-certs.sh
# Prérequis : openssl installé (Linux/macOS natif, Windows via Git Bash)
set -euo pipefail

# Correction Git Bash (Windows) : empêche la conversion des chemins /C=MA → C:\...
export MSYS_NO_PATHCONV=1

CERTS_DIR="config/nginx/certs"
mkdir -p "$CERTS_DIR"

echo "=== 1/3 — CA interne SDA ==="
openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
    -keyout  "$CERTS_DIR/ca.key" \
    -out     "$CERTS_DIR/ca.crt" \
    -subj    "/C=MA/O=SDA-POC/CN=SDA-Internal-CA"

echo "=== 2/3 — Certificat serveur (Nginx) avec SAN ==="
openssl req -newkey rsa:2048 -nodes \
    -keyout "$CERTS_DIR/server.key" \
    -out    "$CERTS_DIR/server.csr" \
    -subj   "/C=MA/O=SDA-POC/CN=sda-node"

# SAN requis par Chrome 58+ — couvre localhost + IPs VMnet1 des 3 nœuds
echo "subjectAltName=DNS:localhost,DNS:sda-node,IP:127.0.0.1,IP:192.168.200.1,IP:192.168.200.128,IP:192.168.200.100" > san.ext

openssl x509 -req -days 365 \
    -in      "$CERTS_DIR/server.csr" \
    -CA      "$CERTS_DIR/ca.crt" \
    -CAkey   "$CERTS_DIR/ca.key" \
    -CAcreateserial \
    -extfile san.ext \
    -out     "$CERTS_DIR/server.crt"

rm -f san.ext

echo "=== 3/3 — Certificat client (nœud SDA) ==="
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

# Génère le .p12 pour import navigateur (Windows + macOS + Firefox)
# Mot de passe : sda2026
openssl pkcs12 -export \
    -out     "$CERTS_DIR/sda-client.p12" \
    -inkey   "$CERTS_DIR/client.key" \
    -in      "$CERTS_DIR/client.crt" \
    -certfile "$CERTS_DIR/ca.crt" \
    -passout pass:sda2026

rm -f "$CERTS_DIR"/*.csr "$CERTS_DIR"/*.srl

echo ""
echo "Certificats générés dans $CERTS_DIR :"
ls -1 "$CERTS_DIR"
echo ""
echo "=== Import navigateur ==="
echo "Mot de passe du .p12 : sda2026"
echo ""
echo "Windows/Edge/Chrome  : certutil -addstore -user Root $CERTS_DIR/ca.crt"
echo "                       Puis double-clic sur sda-client.p12 → magasin Personnel"
echo ""
echo "Linux/Firefox        : Paramètres → Vie privée → Afficher les certificats"
echo "                       → Autorités → Importer ca.crt (cocher 'sites web')"
echo "                       → Vos certificats → Importer sda-client.p12"
echo ""
echo "Linux/Chrome(NSS)    : certutil -d sql:\$HOME/.pki/nssdb -A -t 'CT,,' -n SDA-CA -i $CERTS_DIR/ca.crt"
echo "                       pk12util -d sql:\$HOME/.pki/nssdb -i $CERTS_DIR/sda-client.p12 -W sda2026"
echo ""
echo "Test mTLS curl :"
echo "  curl --cacert $CERTS_DIR/ca.crt --cert $CERTS_DIR/client.crt --key $CERTS_DIR/client.key https://localhost/health"

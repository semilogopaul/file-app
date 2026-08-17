#!/usr/bin/env sh
# Generates a throwaway self-signed TLS certificate so the full HTTPS
# pipeline (nginx -> frontend/backend) can be built and smoke-tested before
# real certificates exist.
#
# NEVER use this certificate in real production - browsers will show a
# trust warning, and it carries no CA chain or revocation info.

set -eu

CERT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DOMAIN="${1:-localhost}"

openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN"

chmod 644 "$CERT_DIR/fullchain.pem"
chmod 600 "$CERT_DIR/privkey.pem"

echo "Self-signed certificate generated for CN=$DOMAIN in $CERT_DIR"

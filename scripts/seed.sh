#!/usr/bin/env bash
#
# Creates the demo account documented in the README, so a reviewer can sign
# in immediately instead of having to register first. Registering still
# works and is the normal path.
#
# Runs against the public API rather than writing to the database directly,
# so the account is created through exactly the same code path as a real
# sign-up - password hashing included. Idempotent: an existing account is
# reported and left alone.
set -euo pipefail

BASE="${BASE_URL:-https://localhost}"
EMAIL="${DEMO_EMAIL:-demo@istore.app}"
PASSWORD="${DEMO_PASSWORD:-istore-demo-2026}"

# -k because the local certificate is self-signed by design.
status=$(curl -sk -o /tmp/istore-seed.json -w '%{http_code}' \
  -X POST "$BASE/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

case "$status" in
  201|200)
    printf '\033[32m✓ Demo account created\033[0m\n' ;;
  409)
    printf '\033[33m• Demo account already exists\033[0m\n' ;;
  000)
    printf '\033[31m✗ Could not reach %s - is the stack up? (make up)\033[0m\n' "$BASE"
    exit 1 ;;
  *)
    printf '\033[31m✗ Unexpected response (%s):\033[0m\n' "$status"
    cat /tmp/istore-seed.json; echo
    exit 1 ;;
esac

echo
echo "  Sign in at $BASE/login"
echo "  Email:    $EMAIL"
echo "  Password: $PASSWORD"

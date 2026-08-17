#!/usr/bin/env bash
#
# First-run setup. Creates everything that is deliberately NOT in git:
# per-environment .env files (which carry secrets) and a TLS certificate.
#
# Safe to re-run: existing files are left alone, so it never clobbers a
# secret you have already set.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

green() { printf '\033[32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[33m%s\033[0m\n' "$1"; }

# --------------------------------------------------------------------------
# 1. Environment files
# --------------------------------------------------------------------------
generate_secret() {
  # openssl is already a hard dependency below (TLS), so no need for node here.
  openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-64
}

if [ -f backend/.env.production ]; then
  yellow "• backend/.env.production already exists - left unchanged"
else
  secret="$(generate_secret)"
  # The example file is the single source of truth for which variables exist;
  # this only substitutes the values that must differ per install.
  sed -e "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" \
      -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://fileapp:fileapp@postgres:5432/fileapp?schema=public|" \
      -e "s|^STORAGE_ENDPOINT=.*|STORAGE_ENDPOINT=http://minio:9000|" \
      backend/.env.example > backend/.env.production
  green "✓ backend/.env.production created (JWT secret generated)"
fi

if [ -f frontend/.env.production ]; then
  yellow "• frontend/.env.production already exists - left unchanged"
else
  cp frontend/.env.example frontend/.env.production
  green "✓ frontend/.env.production created"
fi

# --------------------------------------------------------------------------
# 2. TLS certificate
#
# Self-signed, so browsers will warn. That is expected for a local run - the
# alternative is shipping a private key in the repo, which is never right.
# --------------------------------------------------------------------------
if [ -f nginx/certs/fullchain.pem ] && [ -f nginx/certs/privkey.pem ]; then
  yellow "• TLS certificate already exists - left unchanged"
else
  ./nginx/certs/generate-self-signed.sh localhost >/dev/null 2>&1
  green "✓ Self-signed TLS certificate generated for localhost"
fi

echo
green "Setup complete. Next:  make up"

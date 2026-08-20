#!/usr/bin/env bash
set -euo pipefail

# Uso local na VPS, se quiser atualizar sem o GitHub Actions:
#   BACKEND_IMAGE=ghcr.io/brenorosa10/scorehistory-backend:latest \
#   FRONTEND_IMAGE=ghcr.io/brenorosa10/scorehistory-frontend:latest \
#   ./scripts/deploy.sh

cd "$(dirname "$0")/.."
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f

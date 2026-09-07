#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker network inspect proxy >/dev/null 2>&1; then
  docker network create proxy
fi

git pull
docker compose up -d --build --remove-orphans

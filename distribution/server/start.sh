#!/usr/bin/env sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$root"

if [ ! -f .env ]; then
  echo 'Missing .env. Run ./install.sh first or copy .env.example to .env.' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo 'Docker Engine is not running or the current user cannot access it.' >&2
  exit 1
fi

# COMPOSE_PROFILES is read from the existing .env. BOX_START_PROFILES is an
# optional one-shot override and never writes back to .env.
if [ -n "${BOX_START_PROFILES:-}" ]; then
  COMPOSE_PROFILES="$BOX_START_PROFILES" docker compose --env-file .env -f compose.yml up -d --no-build --remove-orphans --wait
else
  docker compose --env-file .env -f compose.yml up -d --no-build --remove-orphans --wait
fi
echo 'BOX3 Engine services started using the existing .env.'

#!/usr/bin/env sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$root"

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker Engine and Docker Compose are required.' >&2
  exit 1
fi
docker info >/dev/null
docker compose version >/dev/null

if [ ! -f .env ]; then
  cp .env.example .env
  if command -v openssl >/dev/null 2>&1; then
    permission_secret=$(openssl rand -hex 32)
    auth_secret=$(openssl rand -hex 32)
    admin_secret=$(openssl rand -hex 32)
    sed -i.bak \
      -e "s/CHANGE_ME_PERMISSION_TOKEN_SECRET/$permission_secret/" \
      -e "s/CHANGE_ME_PLAYER_AUTH_API_KEY/$auth_secret/" \
      -e "s/CHANGE_ME_PLAY_ADMIN_TOKEN/$admin_secret/" .env
    rm -f .env.bak
  fi
  echo 'Created .env. Review public URLs and optional PostgreSQL/Redis settings before public deployment.'
fi

archive='box-local-engine-images-0.2.0-linux-amd64.tar.gz'
if [ ! -f "$archive" ]; then
  echo "Missing $archive" >&2
  exit 1
fi

./verify.sh
echo 'Loading offline images…'
docker load -i "$archive"
echo 'Starting BOX Local Engine…'
docker compose --env-file .env up -d --no-build --remove-orphans
echo 'Done. Creator: http://127.0.0.1:3127/  Play: http://127.0.0.1:3121/'

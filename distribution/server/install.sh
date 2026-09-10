#!/usr/bin/env sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$root"

if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker Engine and Docker Compose v2 are required.' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo 'Docker Engine is not running or the current user cannot access it. Start Docker and re-login after joining the docker group.' >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo 'Docker Compose v2 plugin is required. The old docker-compose command is not supported.' >&2
  exit 1
fi

if [ ! -s /etc/machine-id ]; then
  echo 'Missing /etc/machine-id; a stable Linux machine identity is required for licensing.' >&2
  exit 1
fi

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

if [ ! -f .env ]; then
  cp .env.example .env
  permission_secret=$(random_hex)
  auth_secret=$(random_hex)
  admin_secret=$(random_hex)
  manager_secret=$(random_hex)
  # Bind the license device identity to the operator's .env so unpacking a new
  # package version does not silently invalidate an installed license.
  license_secret=$(random_hex)
  # The Web manager runs inside a container, so it cannot discover the host LAN
  # address itself. Record it now, while we are still on the host.
  lan_ip=''
  if command -v ip >/dev/null 2>&1; then
    lan_ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") print $(i+1)}' | head -n 1)
  fi
  if [ -z "$lan_ip" ] && command -v hostname >/dev/null 2>&1; then
    lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
  sed -i.bak \
    -e "s/CHANGE_ME_PERMISSION_TOKEN_SECRET/$permission_secret/" \
    -e "s/CHANGE_ME_PLAYER_AUTH_API_KEY/$auth_secret/" \
    -e "s/CHANGE_ME_PLAY_ADMIN_TOKEN/$admin_secret/" \
    -e "s/CHANGE_ME_SERVER_MANAGER_TOKEN/$manager_secret/" \
    -e "s/^BOX_LICENSE_INSTALL_SECRET=.*/BOX_LICENSE_INSTALL_SECRET=$license_secret/" \
    -e "s/^BOX_LAN_IP=.*/BOX_LAN_IP=$lan_ip/" .env
  rm -f .env.bak
  chmod 600 .env
  echo 'Created .env. Review it before exposing any service to a LAN or the internet.'
fi

archive='__IMAGE_ARCHIVE__'
if [ ! -f "$archive" ]; then
  echo "Missing $archive" >&2
  exit 1
fi

./verify.sh
echo 'Loading offline images…'
docker load -i "$archive"
image_tag=$(sed -n 's/^BOX_IMAGE_TAG=//p' .env | tail -n 1)
case "$image_tag" in
  ''|*[!A-Za-z0-9._-]*) echo 'Invalid BOX_IMAGE_TAG in .env' >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64) expected_arch=amd64 ;;
  aarch64|arm64) expected_arch=arm64 ;;
  *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
esac
for service in player-service player-auth-portal server-manager creator play voxa; do
  image="box-local-engine-$service:$image_tag"
  actual_arch=$(docker image inspect "$image" --format '{{.Architecture}}')
  if [ "$actual_arch" != "$expected_arch" ]; then
    echo "Image architecture mismatch for $image: expected $expected_arch, got $actual_arch" >&2
    exit 1
  fi
done
echo 'Starting the Linux Web manager…'
docker compose --env-file .env -f compose.yml up -d --no-build --remove-orphans --wait server-manager
echo 'Done. Linux Web manager: http://127.0.0.1:3130'
echo 'Use BOX_SERVER_MANAGER_TOKEN from .env to sign in. Keep this token private.'
echo 'Install a license in the Web manager, then start the required engine services.'

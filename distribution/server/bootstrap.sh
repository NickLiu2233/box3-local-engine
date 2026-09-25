#!/usr/bin/env sh
set -eu

# Public bootstrap installer for headless Linux hosts. This file is published
# as the stable `install.sh` release asset; the full offline package keeps its
# own installer for image verification and service startup.

REPOSITORY_URL=${BOX3_REPOSITORY_URL:-https://github.com/ifishcool/box-local-engine}
RELEASE_CDN_URL=${BOX3_RELEASE_CDN_URL:-https://assets.box3.fun/local-engine}
INSTALL_DIRECTORY=${BOX3_INSTALL_DIRECTORY:-/opt/box3-engine}
REQUESTED_VERSION=${BOX3_VERSION:-latest}
MACHINE_ID_FILE=${BOX3_MACHINE_ID_FILE:-/etc/machine-id}
OS_RELEASE_FILE=${BOX3_OS_RELEASE_FILE:-/etc/os-release}
MANAGER_BIND_IP=${BOX3_MANAGER_BIND_IP:-0.0.0.0}
INSTALL_STARTED_AT=$(date +%s)

if [ -t 1 ]; then
  COLOR_TITLE=$(printf '\033[1;36m')
  COLOR_LABEL=$(printf '\033[1;33m')
  COLOR_SUCCESS=$(printf '\033[1;32m')
  COLOR_RESET=$(printf '\033[0m')
else
  COLOR_TITLE=''
  COLOR_LABEL=''
  COLOR_SUCCESS=''
  COLOR_RESET=''
fi

info() {
  printf '\n[BOX3] %s\n' "$1"
}

fail() {
  printf '\n[BOX3] 安装失败：%s\n' "$1" >&2
  exit 1
}

if [ "$(id -u)" -ne 0 ]; then
  fail '请使用 curl -fsSL <安装地址>/install.sh | sudo bash 运行安装器。'
fi

if [ "$(uname -s)" != 'Linux' ]; then
  fail '一键安装器只支持 Linux。Windows 和 macOS 请使用桌面发行包。'
fi

case "$(uname -m)" in
  x86_64|amd64) architecture=amd64 ;;
  aarch64|arm64) architecture=arm64 ;;
  *) fail "不支持的 CPU 架构：$(uname -m)" ;;
esac

case "$MANAGER_BIND_IP" in
  127.0.0.1|0.0.0.0) ;;
  *) fail 'BOX3_MANAGER_BIND_IP 只允许设置为 127.0.0.1 或 0.0.0.0。' ;;
esac

install_download_tools() {
  missing=''
  for command_name in curl unzip; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      missing="$missing $command_name"
    fi
  done
  [ -z "$missing" ] && return

  info '安装下载工具'
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl unzip
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y ca-certificates curl unzip
  elif command -v yum >/dev/null 2>&1; then
    yum install -y ca-certificates curl unzip
  else
    fail "缺少$missing，且无法识别系统包管理器。请先安装 curl、unzip 和 CA 证书。"
  fi
}

install_compose_plugin_binary() {
  case "$architecture" in
    amd64) compose_architecture=x86_64 ;;
    arm64) compose_architecture=aarch64 ;;
  esac
  compose_directory=/usr/local/lib/docker/cli-plugins
  mkdir -p "$compose_directory"
  curl --proto '=https' --tlsv1.2 --fail --location --retry 3 \
    "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${compose_architecture}" \
    -o "$compose_directory/docker-compose"
  chmod +x "$compose_directory/docker-compose"
}

install_alibaba_docker_ce() {
  info '从阿里云 Docker CE 仓库安装 Docker Engine'
  docker_repo=/etc/yum.repos.d/docker-ce.repo
  if ! curl --proto '=https' --tlsv1.2 --fail --location --retry 3 --retry-delay 2 \
    https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -o "$docker_repo"; then
    rm -f "$docker_repo"
    return 1
  fi
  if ! dnf install -y --nobest docker-ce docker-ce-cli containerd.io docker-buildx-plugin; then
    rm -f "$docker_repo"
    return 1
  fi
}

install_ubuntu_docker_from_aliyun_mirror() {
  command -v apt-get >/dev/null 2>&1 || return 1
  command -v dpkg >/dev/null 2>&1 || return 1

  ubuntu_codename=$(sed -n 's/^VERSION_CODENAME=//p' "$OS_RELEASE_FILE" | tail -n 1 | tr -d '"')
  case "$ubuntu_codename" in
    ''|*[!a-z0-9-]*) return 1 ;;
  esac

  info '使用阿里云 Docker CE 镜像源安装 Docker Engine 与 Compose'
  docker_keyring=/etc/apt/keyrings/docker.asc
  docker_source=/etc/apt/sources.list.d/docker-ce.list
  install -m 0755 -d /etc/apt/keyrings
  if ! curl --proto '=https' --tlsv1.2 --fail --location --retry 3 --retry-delay 2 \
    https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg -o "$docker_keyring"; then
    rm -f "$docker_keyring"
    return 1
  fi
  chmod a+r "$docker_keyring"
  printf '%s\n' \
    "deb [arch=$(dpkg --print-architecture) signed-by=$docker_keyring] https://mirrors.aliyun.com/docker-ce/linux/ubuntu $ubuntu_codename stable" \
    >"$docker_source"

  if apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; then
    return 0
  fi

  # Leave no broken third-party source behind before trying Docker's official
  # installer. Existing OS sources remain untouched.
  rm -f "$docker_source" "$docker_keyring"
  apt-get update || true
  return 1
}

install_docker_from_official_source() {
  info '阿里云 Docker CE 镜像源不可用，回退到 Docker 官方安装源'
  docker_installer=$(mktemp)
  if ! curl --proto '=https' --tlsv1.2 --fail --location --retry 3 --retry-delay 2 \
    https://get.docker.com -o "$docker_installer"; then
    rm -f "$docker_installer"
    fail '无法从阿里云或 Docker 官方源下载 Docker 安装器。请检查服务器网络后重试。'
  fi
  sh "$docker_installer"
  rm -f "$docker_installer"
}

install_alibaba_cloud_linux_docker() {
  alinux_version=${VERSION_ID:-}
  alinux_major=${alinux_version%%.*}
  info "检测到 Alibaba Cloud Linux ${alinux_version:-未知版本}，使用专用 Docker 安装流程"

  case "$alinux_major" in
    3|4)
      command -v dnf >/dev/null 2>&1 || fail "Alibaba Cloud Linux ${alinux_major} 缺少 dnf。"
      # Alibaba Cloud Linux 3 and 4 use the release-version adapter when
      # Docker CE packages from their matching alinuxN-plus repository resolve
      # CentOS-compatible metadata.
      alinux_repository="alinux${alinux_major}-plus"
      dnf install -y dnf-plugin-releasever-adapter --repo "$alinux_repository"
      if ! dnf install -y --nobest docker-ce; then
        info "${alinux_repository} 未提供 docker-ce，改用阿里云 Docker CE 仓库"
        if ! install_alibaba_docker_ce; then
          info '阿里云 Docker CE 仓库不可用，回退到 Docker 官方安装源'
          install_docker_from_official_source
        fi
      fi
      if ! dnf install -y docker-compose-plugin; then
        info '仓库未提供 Compose 插件，改用 Docker Compose 官方二进制'
        install_compose_plugin_binary
      fi
      ;;
    2)
      command -v yum >/dev/null 2>&1 || fail 'Alibaba Cloud Linux 2 缺少 yum。'
      yum install -y yum-utils device-mapper-persistent-data lvm2
      yum-config-manager --add-repo \
        https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
      if ! yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin; then
        fail '无法从阿里云 Docker CE 镜像仓库安装 Docker。'
      fi
      if ! yum install -y docker-compose-plugin; then
        info '仓库未提供 Compose 插件，改用 Docker Compose 官方二进制'
        install_compose_plugin_binary
      fi
      ;;
    *)
      fail "暂不支持 Alibaba Cloud Linux ${alinux_version:-未知版本}，当前支持 2、3 和 4。"
      ;;
  esac
}

install_docker() {
  docker_command=''
  if command -v docker >/dev/null 2>&1; then
    docker_command=$(docker --version 2>&1 || true)
  fi
  if ! command -v docker >/dev/null 2>&1 || printf '%s' "$docker_command" | grep -qi podman; then
    if printf '%s' "$docker_command" | grep -qi podman; then
      info '检测到 podman-docker 兼容命令，BOX3 需要真实 Docker Engine，将重新安装 Docker'
      if command -v dnf >/dev/null 2>&1; then
        dnf remove -y podman-docker podman || true
      elif command -v yum >/dev/null 2>&1; then
        yum remove -y podman-docker podman || true
      fi
    fi
    info '安装 Docker Engine 与 Docker Compose'
    distribution_id=''
    VERSION_ID=''
    if [ -r "$OS_RELEASE_FILE" ]; then
      # os-release is a system-owned key/value file. Restrict the only values
      # consumed below instead of evaluating arbitrary installer input.
      distribution_id=$(sed -n 's/^ID=//p' "$OS_RELEASE_FILE" | tail -n 1 | tr -d '"')
      VERSION_ID=$(sed -n 's/^VERSION_ID=//p' "$OS_RELEASE_FILE" | tail -n 1 | tr -d '"')
    fi
    if [ "$distribution_id" = 'alinux' ]; then
      install_alibaba_cloud_linux_docker
    elif [ "$distribution_id" = 'ubuntu' ] && install_ubuntu_docker_from_aliyun_mirror; then
      :
    else
      install_docker_from_official_source
    fi
  fi

  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now docker
  elif command -v service >/dev/null 2>&1; then
    service docker start
  fi

  docker info >/dev/null 2>&1 || fail 'Docker Engine 未正常运行，请检查 Docker 服务日志。'
  docker compose version >/dev/null 2>&1 || fail '缺少 Docker Compose v2 插件。'
}

resolve_version() {
  if [ "$REQUESTED_VERSION" != 'latest' ]; then
    version=${REQUESTED_VERSION#v}
  elif [ -n "$RELEASE_CDN_URL" ]; then
    if version=$(curl --proto '=https' --tlsv1.2 -fsSL \
      "${RELEASE_CDN_URL%/}/latest.txt"); then
      version=${version#v}
    else
      info 'CDN 版本信息不可用，回退到 GitHub Releases'
      resolve_github_version
    fi
  else
    resolve_github_version
  fi
  case "$version" in
    ''|*[!0-9A-Za-z._-]*) fail '无法确定可安装的发行版本。' ;;
  esac
}

resolve_github_version() {
  latest_url=$(curl --proto '=https' --tlsv1.2 -fsSL \
    -o /dev/null -w '%{url_effective}' "$REPOSITORY_URL/releases/latest")
  version=${latest_url##*/}
  version=${version#v}
}

is_ipv4_address() {
  printf '%s\n' "$1" | awk -F. '
    NF == 4 {
      for (field = 1; field <= 4; field++) {
        if ($field !~ /^[0-9]+$/ || $field > 255) exit 1
      }
      exit 0
    }
    { exit 1 }
  '
}

detect_public_ipv4() {
  for endpoint in \
    https://api-ipv4.ip.sb/ip \
    https://ipv4.icanhazip.com; do
    candidate=$(curl --proto '=https' --tlsv1.2 --fail --location --retry 2 --retry-delay 1 \
      --max-time 5 "$endpoint" 2>/dev/null | tr -d '\r\n' || true)
    if is_ipv4_address "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

set_env_value() {
  key=$1
  value=$2
  if grep -q "^${key}=" .env; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" .env
    rm -f .env.bak
  else
    printf '%s=%s\n' "$key" "$value" >>.env
  fi
}

read_env_value() {
  key=$1
  sed -n "s/^${key}=//p" .env | tail -n 1
}

release_env_value() {
  key=$1
  sed -n "s/^${key}=//p" .env.example | tail -n 1
}

running_application_services() {
  [ -f "$INSTALL_DIRECTORY/.env" ] || return
  [ -f "$INSTALL_DIRECTORY/compose.yml" ] || return
  docker compose --env-file "$INSTALL_DIRECTORY/.env" \
    -f "$INSTALL_DIRECTORY/compose.yml" ps --services --filter status=running 2>/dev/null |
    while IFS= read -r service_name; do
      case "$service_name" in
        player-service|player-auth-portal|creator|play|voxa)
          printf '%s\n' "$service_name"
          ;;
      esac
    done
}

open_manager_firewall() {
  port=$1
  [ "$MANAGER_BIND_IP" = '0.0.0.0' ] || return
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q '^Status: active'; then
    ufw allow "${port}/tcp" >/dev/null
    info "已在 UFW 放行 TCP $port"
  elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
    firewall-cmd --permanent --add-port="${port}/tcp" >/dev/null
    firewall-cmd --reload >/dev/null
    info "已在 firewalld 放行 TCP $port"
  fi
}

existing_installation_matches_target() {
  [ -f "$INSTALL_DIRECTORY/.env" ] || return 1
  [ -f "$INSTALL_DIRECTORY/compose.yml" ] || return 1
  [ -x "$INSTALL_DIRECTORY/start.sh" ] || return 1

  installed_image_tag=$(sed -n 's/^BOX_IMAGE_TAG=//p' "$INSTALL_DIRECTORY/.env" | tail -n 1)
  installed_platform=$(sed -n 's/^BOX_PLAY_PLATFORM=//p' "$INSTALL_DIRECTORY/.env" | tail -n 1)
  expected_image_tag="v${version}-linux-${architecture}"
  [ "$installed_image_tag" = "$expected_image_tag" ] || return 1
  [ "$installed_platform" = "linux/${architecture}" ] || return 1

  for service in player-service player-auth-portal server-manager creator play voxa; do
    docker image inspect "box-local-engine-${service}:${expected_image_tag}" >/dev/null 2>&1 || return 1
  done
}

install_download_tools
install_docker

if [ ! -s "$MACHINE_ID_FILE" ]; then
  fail '缺少 /etc/machine-id，无法生成稳定的许可证设备身份。'
fi

resolve_version
if existing_installation_matches_target; then
  info "检测到已安装的 BOX3 Engine ${version}（linux/${architecture}），跳过下载和更新，直接启动服务"
  "$INSTALL_DIRECTORY/start.sh"
  exit 0
fi

package_name="BOX3-Engine-Server-$version-linux-$architecture"
if [ -n "$RELEASE_CDN_URL" ]; then
  package_url="${RELEASE_CDN_URL%/}/$package_name.zip"
else
  package_url="$REPOSITORY_URL/releases/download/v$version/$package_name.zip"
fi
temporary_directory=$(mktemp -d)
cleanup() {
  exit_status=$?
  trap - EXIT HUP INT TERM
  rm -rf "$temporary_directory"
  exit "$exit_status"
}
trap cleanup EXIT HUP INT TERM

info "下载 BOX3 Engine ${version}（linux/${architecture}）"
if ! curl --proto '=https' --tlsv1.2 --fail --location \
  --retry 3 --retry-delay 2 --output "$temporary_directory/package.zip" "$package_url"; then
  if [ -z "$RELEASE_CDN_URL" ]; then
    fail '无法下载服务器发行包。'
  fi
  github_package_url="$REPOSITORY_URL/releases/download/v$version/$package_name.zip"
  info 'CDN 发行包不可用，回退到 GitHub Releases'
  curl --proto '=https' --tlsv1.2 --fail --location \
    --retry 3 --retry-delay 2 --output "$temporary_directory/package.zip" \
    "$github_package_url"
fi
unzip -q "$temporary_directory/package.zip" -d "$temporary_directory/unpacked"
package_directory="$temporary_directory/unpacked/$package_name"
[ -d "$package_directory" ] || fail '发行包目录结构无效。'

chmod +x "$package_directory"/*.sh
"$package_directory/verify.sh"

# Remember only the packaged application services that are currently running.
# Databases, Redis and map runtime containers keep their own lifecycle and are
# never removed by the updater.
previously_running_services=$(running_application_services || true)

info "安装到 $INSTALL_DIRECTORY"
mkdir -p "$INSTALL_DIRECTORY"
# The release package never contains .env, licences, maps, models or database
# data. Copying it over an existing installation upgrades executable files
# while preserving all operator-owned state in the stable install directory.
cp -a "$package_directory"/. "$INSTALL_DIRECTORY"/
chmod +x "$INSTALL_DIRECTORY"/*.sh

info '导入镜像并启动管理端'
cd "$INSTALL_DIRECTORY"
environment_backup=''
if [ -f .env ]; then
  environment_backup="$temporary_directory/environment.backup"
  cp .env "$environment_backup"
  new_image_tag=$(release_env_value BOX_IMAGE_TAG)
  new_play_platform=$(release_env_value BOX_PLAY_PLATFORM)
  [ -n "$new_image_tag" ] || fail '发行包缺少 BOX_IMAGE_TAG。'
  [ -n "$new_play_platform" ] || fail '发行包缺少 BOX_PLAY_PLATFORM。'
  set_env_value BOX_IMAGE_TAG "$new_image_tag"
  set_env_value BOX_PLAY_PLATFORM "$new_play_platform"
fi
if ! ./install.sh; then
  if [ -n "$environment_backup" ]; then
    cp "$environment_backup" .env
  fi
  fail '新版本安装失败，已恢复原配置。'
fi

set_env_value BOX_SERVER_MANAGER_BIND_IP "$MANAGER_BIND_IP"
docker compose --env-file .env -f compose.yml up -d --no-build \
  --remove-orphans --force-recreate --wait server-manager

if [ -n "$previously_running_services" ]; then
  # Service names come from the fixed allow-list in
  # running_application_services, so intentional word splitting is safe here.
  # shellcheck disable=SC2086
  docker compose --env-file .env -f compose.yml up -d --no-build \
    --force-recreate --wait $previously_running_services
fi

manager_port=$(read_env_value BOX_SERVER_MANAGER_PORT)
manager_port=${manager_port:-3130}
open_manager_firewall "$manager_port"
lan_ip=$(read_env_value BOX_LAN_IP)
if [ -z "$lan_ip" ] && command -v hostname >/dev/null 2>&1; then
  lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
public_ip=${BOX3_PUBLIC_IP:-}
if [ -z "$public_ip" ]; then
  public_ip=$(detect_public_ipv4 || true)
fi
manager_token=$(read_env_value BOX_SERVER_MANAGER_TOKEN)
owner_token=$(read_env_value BOX_PLAY_ADMIN_TOKEN)

INSTALL_FINISHED_AT=$(date +%s)
INSTALL_ELAPSED_SECONDS=$((INSTALL_FINISHED_AT - INSTALL_STARTED_AT))
INSTALL_ELAPSED_MINUTES=$((INSTALL_ELAPSED_SECONDS / 60))
INSTALL_ELAPSED_REMAINDER=$((INSTALL_ELAPSED_SECONDS % 60))

printf '\n%s========================================================================%s\n' \
  "$COLOR_TITLE" "$COLOR_RESET"
printf '%s                    BOX3 Engine 面板账户登录信息%s\n' \
  "$COLOR_TITLE" "$COLOR_RESET"
printf '%s========================================================================%s\n' \
  "$COLOR_TITLE" "$COLOR_RESET"
printf '%s安装状态：%s%s安装成功%s\n' \
  "$COLOR_LABEL" "$COLOR_RESET" "$COLOR_SUCCESS" "$COLOR_RESET"
printf '%s安装目录：%s%s\n' "$COLOR_LABEL" "$COLOR_RESET" "$INSTALL_DIRECTORY"
if [ "$MANAGER_BIND_IP" = '0.0.0.0' ]; then
  printf '\n%s【云服务器】请在安全组放行 TCP %s 端口%s\n' \
    "$COLOR_LABEL" "$manager_port" "$COLOR_RESET"
  if [ -n "$public_ip" ]; then
    printf '外网 IPv4 面板地址：http://%s:%s\n' "$public_ip" "$manager_port"
  fi
  if [ -n "$lan_ip" ]; then
    printf '内网面板地址：     http://%s:%s\n' "$lan_ip" "$manager_port"
  fi
else
  printf '\n本机面板地址：http://127.0.0.1:%s\n' "$manager_port"
fi
printf '\n%s管理端登录密钥：%s%s\n' "$COLOR_LABEL" "$COLOR_RESET" "$manager_token"
printf '%s服主管理密钥：  %s%s\n' "$COLOR_LABEL" "$COLOR_RESET" "$owner_token"
printf '\n请立即保存以上信息。密钥只应交给服主，不要截图或公开。\n'
printf '%s========================================================================%s\n' \
  "$COLOR_TITLE" "$COLOR_RESET"
printf '%s安装耗时：%s%d 分 %d 秒\n' \
  "$COLOR_SUCCESS" "$COLOR_RESET" "$INSTALL_ELAPSED_MINUTES" "$INSTALL_ELAPSED_REMAINDER"

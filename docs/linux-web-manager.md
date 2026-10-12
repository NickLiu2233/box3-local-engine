# 从纯 Linux 系统部署 BOX3 Engine

本文是无图形 Linux 服务器的完整部署入口。服务器只需要 Linux、Docker Engine 和 Docker Compose v2；

服务器安装 ZIP 不内置 Docker 镜像，只包含安装脚本、配置模板和小型镜像清单。安装时下载 Server Manager；Creator、VOXA、Play、Player Service、参考登录门户镜像会在首次启动对应服务时按需下载。PostgreSQL、Redis 与托管 Nginx 也只在选择启用时拉取。服务器需要能够访问 `https://assets.box3.fun` 和相应基础镜像源，也可以填写外部 PostgreSQL/Redis 并关闭托管 Nginx。

## 1. 准备服务器

| `uname -m`        | 下载包后缀        |
| ----------------- | ----------------- |
| `x86_64`          | `linux-amd64.zip` |
| `aarch64`/`arm64` | `linux-arm64.zip` |

推荐 Linux 使用仍在安全支持期内的 Ubuntu LTS（22.04、24.04 或 26.04）或 Debian。

Ubuntu 一键安装会优先使用阿里云 Docker CE 镜像源，镜像源不可用时回退 Docker 官方安装源。一键安装器也支持 Alibaba Cloud Linux 2/3/4。版本 3/4 使用对应的 `alinuxN-plus` 仓库，版本 2 使用阿里云 Docker CE 镜像仓库；安装结束前会验证 Docker Engine 与 Compose v2。

| 使用范围                      | CPU      | 内存       | 可用磁盘 |
| ----------------------------- | -------- | ---------- | -------- |
| 只运行 Web 管理端             | 1 核     | 1 GB       | 10 GB    |
| 小规模 Play、玩家服务和数据库 | 4 核     | 8 GB       | 30 GB    |
| Creator、VOXA、Play 全部服务  | 8 核以上 | 16 GB 以上 | 50 GB 起 |

这些是部署余量建议。容器限制是上限，不会预先占用对应内存；地图数量、脚本和同时在线人数会影响实际消耗。

```bash
uname -m
cat /etc/os-release
test -s /etc/machine-id && echo machine-id-ok
df -h /
```

## 2. 一键安装

联网服务器直接执行：

```bash
curl -fsSL https://assets.box3.fun/local-engine/install.sh | sudo bash
```

安装器会自动识别 `amd64` 或 `arm64`、准备 Docker Engine 与 Compose v2、下载并校验匹配的完整发行包，然后安装到 `/opt/box3-engine` 并启动管理端。管理端默认监听 `0.0.0.0:3130`，安装完成时会显示局域网地址、公网地址、管理端登录密钥和服主管理密钥。重复执行会升级程序文件并保留现有配置、地图、模型、备份和数据库卷。

重复执行进行升级时，只更新发行镜像标签和平台字段，并重建升级前正在运行的六个应用服务。未运行的服务、PostgreSQL、Redis、地图运行时和所有持久数据不会被安装器删除。

安装器会在已启用的 UFW 或 firewalld 中自动放行 TCP 3130；云厂商安全组仍需由服主手动放行。公网部署应尽快使用 HTTPS 反向代理或 VPN 保护管理端；不需要公网和局域网访问时，可以下载安装器后通过 `BOX3_MANAGER_BIND_IP=127.0.0.1` 执行。

安装后只启动管理端，Play、Creator 等业务服务由服主配置后启动。安装完成后继续阅读“登录管理端”和“配置并启动服务”。

## 3. 手动安装 Docker

无法使用一键安装器，或希望自己准备 Docker 和安装目录时，按本节手动安装。管理器首次启动仍需访问 `https://assets.box3.fun` 下载其镜像。

Ubuntu 可以直接安装发行版软件包：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 unzip ca-certificates curl
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

退出 SSH 后重新登录，使 `docker` 用户组生效。然后验证：

```bash
docker info
docker compose version
```

必须看到 Docker Engine 正常运行，并且 Compose 版本为 v2。其他发行版请按 [Docker Engine 官方安装文档](https://docs.docker.com/engine/install/)安装 Engine 与 Compose plugin，再执行相同的验证命令。普通安装使用 `/var/run/docker.sock`；rootless Docker 需要在 `.env` 中把 `BOX_DOCKER_SOCKET` 改为实际 Socket 路径。

## 4. 解压和校验服务器包

把与 CPU 架构一致的 `BOX3-Engine-Server-<版本>-linux-<架构>.zip` 上传到服务器。以下示例安装到 `/opt/box-engine`：

```bash
sudo mkdir -p /opt/box-engine
sudo chown "$USER":"$USER" /opt/box-engine
unzip BOX3-Engine-Server-*-linux-*.zip -d /opt/box-engine
cd /opt/box-engine/BOX3-Engine-Server-*-linux-*
chmod +x *.sh
./verify.sh
```

`verify.sh` 必须全部通过。它会校验发行包文件清单和 SHA-256。不要只复制 ZIP 内的部分文件，也不要混用不同版本的 `compose.yml` 和镜像清单。

## 5. 首次安装

```bash
./install.sh
```

安装器会：

1. 再次校验发行包与 CPU 架构；
2. 从 `.env.example` 创建权限为 `0600` 的 `.env`；
3. 生成业务密钥、Web 管理令牌；
4. 按清单下载、校验并导入 Linux Web 管理端自身镜像；
5. 只启动 Rust Web 管理端。

业务服务由服主完成数据配置后启动；缺少的服务镜像会在首次启动对应服务时下载并校验。安装器不会覆盖已有 `.env`。

```bash
./status.sh
./logs.sh server-manager
```

正常结果中 `server-manager` 应为 `healthy`。管理镜像不包含 Node.js、Rust 工具链、源码或构建缓存。

## 6. 登录管理端

一键安装模式可以直接打开安装器输出的局域网或公网地址。手动解压运行 `./install.sh`，或使用 `BOX3_MANAGER_BIND_IP=127.0.0.1` 时，管理端只绑定服务器的 `127.0.0.1:3130`，需要在自己的电脑建立 SSH 隧道：

```bash
ssh -L 3130:127.0.0.1:3130 <服务器用户>@<服务器地址>
```

保持 SSH 连接，在本机浏览器打开 `http://127.0.0.1:3130`。服务器上的管理密钥可用下面命令读取：

```bash
sed -n 's/^BOX_SERVER_MANAGER_TOKEN=//p' .env
```

管理密钥只保存在当前浏览器标签页。关闭标签页或点击“退出管理”后，下次必须重新输入。不要分享 `.env`、管理密钥或包含密钥的截图。

## 7. 配置并启动服务

首次登录后按顺序操作：

1. 打开“数据配置”，选择 PostgreSQL 模式。
2. 选择内置 PostgreSQL 时，管理端会联网下载 PostgreSQL 16 镜像；选择外部数据库时填写连接信息并执行连接测试。
3. Redis 可以关闭、使用内置实例或连接外部实例。
4. 填写 Play、Creator 的访问地址和监听范围并保存。
5. 在“服务总览”启动“游玩端”“创作端”或“全部服务”。

`.env` 是唯一需要持久保存的配置来源。Rust 管理端在保存配置和启动服务时自动生成 `.runtime.env`；不要手工修改 `.runtime.env`，它会被覆盖。

内置 PostgreSQL 已有数据卷时，管理端会复用原数据库身份。若数据卷存在但 `.env` 中缺少原凭据，管理端会停止保存并提示恢复旧 `.env`，不会生成无法登录的新随机账号。不要用删除数据库卷的方式处理凭据问题。

## 8. 网络与防火墙

| 端口        | 服务               | 默认建议                                            |
| ----------- | ------------------ | --------------------------------------------------- |
| `3130`      | Web 管理端         | 一键安装时开放；应使用强密钥，并配置 HTTPS 或 VPN   |
| `3121`      | Play               | 面向玩家时通过 HTTPS 反向代理开放                   |
| `3125`      | 参考登录门户       | 使用它时通过 HTTPS 反向代理开放                     |
| `3124`      | Player Service     | 不直接开放管理路由；按需通过 HTTPS 网关代理玩家 API |
| `3127`      | Creator            | 默认只允许服主或可信创作者访问                      |
| `3123`      | VOXA               | 默认只允许 Creator 与可信创作者访问                 |
| `5432`      | 内置 PostgreSQL    | 只绑定`127.0.0.1`                                   |
| `6379`      | 内置 Redis         | 只绑定`127.0.0.1`                                   |
| `9966-9967` | Creator 内部运行时 | 只绑定`127.0.0.1`，不要公开                         |

不要把 Docker Socket、PostgreSQL 或 Redis 暴露到公网。3130 直接开放是为了方便首次安装，长期运行时应配置 HTTPS 反向代理、VPN 或来源 IP 白名单；管理密钥通过明文 HTTP 传输并不安全。公网访问 Play、登录门户或远程 Creator 时，也应配置 HTTPS、来源限制、强密钥和防火墙。反向代理说明见[部署和联机](./deployment.md)。

## 9. 资源控制

发行配置为所有长期运行组件设置了资源边界：

- Rust Web 管理端：128 MB、0.5 CPU；
- Player Service：256 MB、0.5 CPU；
- 参考登录门户：64 MB、0.25 CPU；
- 内置 PostgreSQL：512 MB、1 CPU；
- 内置 Redis：256 MB、0.5 CPU；
- VOXA：1 GB、1 CPU；
- Play：4 GB、4 CPU；
- Creator：6 GB、4 CPU。

这些值都可以在 `.env` 调整。已有自己的登录门户时，从 `COMPOSE_PROFILES` 删除 `auth-portal`。无需远程创作时只启动游玩端，不要启动 Creator 与 VOXA。将预热运行时数量保持为 `0` 可以降低空闲占用。

## 10. 日常运维

```bash
./status.sh
./start.sh
./logs.sh player-service
./logs.sh managed-postgres
./stop.sh
./install.sh
```

- `status.sh` 查看服务状态；
- `start.sh` 只启动 Linux Web 管理端；业务服务从管理页面启动；
- `logs.sh [服务名]` 跟踪最近 300 行日志；
- `stop.sh` 停止服务，但不删除工程、地图、备份或 Docker 数据卷；
- `install.sh` 可重新校验安装文件，按清单下载并校验 Web 管理端镜像；已有配置不会被覆盖。

容器使用 `restart: unless-stopped`，服务器重启后会恢复此前运行的服务。Web 页面只能管理固定白名单内的业务服务与内置数据库。

`start.sh` 不会直接启动业务容器，以确保缺少的镜像先经过 Web 管理器清单校验和按需下载。需要让管理端随系统启动时，可将 systemd `ExecStart` 指向包目录中的 `start.sh`；业务服务保持 Docker `restart: unless-stopped`，仍可在主机重启后自行恢复。

登录后可点击页面侧栏底部的更新图标检查版本。确认更新后，管理器会下载新版服务器包并启动独立更新任务；更新任务替换管理器文件与镜像、恢复此前运行的业务服务，并清理未被容器使用的旧版本镜像。管理器重启期间页面会暂时断开，完成后重新连接即可。

## 11. 备份和升级

### Linux 数据目录

首次部署后，可在 Web 管理端的“数据配置 → 数据存储”填写 Linux 绝对路径，例如 `/data/BoxEngineData`。迁移会在该路径保存 Creator 工程、Play 地图、VOXA 模型、构建产物和备份；开始前必须停止全部业务服务。内置 PostgreSQL 与 Redis 使用 Docker 数据卷，不随此操作迁移。

升级前保存：

- `.env`；
- `apps/local-engine/projects/`、`apps/local-engine/play-worlds/`、`apps/voxa/data/`；
- `apps/local-engine/backups/`；
- PostgreSQL 的 `pg_dump` 或数据库服务商快照。

页面文件备份不包含 PostgreSQL。Redis 和 `box-play-runtime-cache` 是可重新生成的数据，不作为永久数据源。

升级到新目录时，先停止旧部署，将 `.env` 和持久数据复制到新目录，再运行新包的 `./verify.sh` 与 `./install.sh`。

## 12. 故障排查

| 现象                        | 处理方式                                                       |
| --------------------------- | -------------------------------------------------------------- |
| 页面打不开                  | 检查 SSH 隧道、`./status.sh`、`./logs.sh server-manager`       |
| 管理端登录失败              | 重新读取当前`.env` 的管理密钥，不要使用旧令牌                  |
| 服务无法启动                | 查看对应服务、数据库日志及数据配置                             |
| Player Service 返回 503     | 查看`./logs.sh player-service` 与 `./logs.sh managed-postgres` |
| PostgreSQL 提示 role 不存在 | 恢复创建该数据卷时使用的`.env`；不要删除卷或生成另一组随机凭据 |
| 内置数据库下载失败          | 检查网络、镜像源、代理和磁盘空间                               |
| 容器被 OOM 终止             | 查看日志，按实际负载提高对应的`*_MEMORY_LIMIT`                 |

配置字段详解见[配置参考](./configuration-reference.md)，数据边界见[本地基础设施](./local-infrastructure.md)。

Nginx 来源在数据服务配置，HTTPS/WSS 证书位于现有公网地址下，证书导入、托管入口及已有外部 Nginx 的接入方式见 [HTTPS 与证书管理](./https-certificate-management.md)。


### 公网地址与 HTTPS 配置

每个服务只使用访问配置中选定模式生成的公开地址；登录页面地址需要从玩家网络可达，不能填写服务器内网 IP 或容器名称。Play、登录页面可使用不同域名，路径前缀也会保留。允许来源由最终公开地址的协议、域名和端口统一生成，不包含路径。

- 使用内置 Nginx：在访问配置中填写公开地址和对应证书，保存后由管理端配置入口与后端端口。公网端口属于 Nginx，应用容器仍使用 HTTP 内部端口。
- 使用宿主机已有 Nginx：Web 管理容器不能直接检测或重载宿主机进程。保存配置后导出 Nginx 配置，放入宿主机 Nginx 的 `http` 配置区，执行配置检查并重载。导出的证书路径指向宿主机部署目录，后端端口绑定在宿主机回环地址。
- 切回本机或局域网：公网地址草稿可保留，实际运行地址、允许来源与端口绑定按当前访问模式生成，不再采用旧公网覆盖值。

仅填写 HTTPS 地址不会自动让外部代理开始提供 TLS。外部 Nginx 应使用生成的上游端口、Host、转发协议和 WebSocket 配置；应用运行配置不应手工混入另一套公开地址。

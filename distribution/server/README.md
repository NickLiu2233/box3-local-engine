# BOX3 Engine 无图形 Linux 服务器包

本包用于没有桌面环境的 Linux amd64/arm64 服务器，包含 Creator、VOXA、Play、Player Service、参考登录门户和 Rust Web 管理端六个离线镜像。运行时只需要 Docker Engine 与 Docker Compose v2，不需要安装 Node.js、pnpm、Rust 或源码仓库。

包内不包含真实 `.env`、密钥、地图、模型、玩家数据、备份、日志，也不包含 PostgreSQL/Redis 镜像。选择内置 PostgreSQL 或 Redis 时需要联网拉取对应基础镜像。

如果尚未下载本包，联网服务器可以直接运行一键安装命令；该命令会自动下载匹配架构的完整包并执行本 README 中的校验和安装流程，同时把管理端开放到局域网和公网，并在终端显示访问地址与两类管理密钥：

```bash
curl -fsSL https://assets.box3.fun/local-engine/install.sh | sudo bash
```

## 一、准备一台纯 Linux 服务器

推荐 Ubuntu 24.04/26.04 LTS 或 Debian 12。运行 `uname -m`：`x86_64` 使用 `linux-amd64` 包，`aarch64`/`arm64` 使用 `linux-arm64` 包。服务器必须有稳定的 `/etc/machine-id`。

硬件建议：

| 范围                         | CPU      | 内存       | 可用磁盘 |
| ---------------------------- | -------- | ---------- | -------- |
| 仅 Web 管理端                | 1 核     | 1 GB       | 10 GB    |
| 小规模 Play 与玩家服务       | 4 核     | 8 GB       | 30 GB    |
| Creator、VOXA、Play 全部服务 | 8 核以上 | 16 GB 以上 | 50 GB 起 |

Ubuntu 24.04 安装 Docker：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 unzip ca-certificates
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

退出 SSH 后重新登录，再确认：

```bash
docker info
docker compose version
test -s /etc/machine-id && echo machine-id-ok
```

其他发行版按 Docker 官方文档安装 Docker Engine 与 Compose plugin。必须使用 `docker compose` v2。

## 二、校验并安装

完整解压 ZIP 并进入含有本 README 的目录：

```bash
chmod +x *.sh
./verify.sh
./install.sh
```

`verify.sh` 校验包内文件和镜像归档 SHA-256。`install.sh` 会再次校验架构与镜像，首次运行时创建权限为 `0600` 的 `.env`，生成业务密钥、Web 管理令牌、内部运行时管理密钥，导入六个镜像，并且只启动 Web 管理端。业务服务由服主完成数据配置后启动。

安装脚本不会覆盖已有 `.env`；升级旧版本时会自动补齐缺失的内部管理密钥，不会替换长度合法的现有密钥。若命令提示没有 Docker 权限，请重新登录使 docker 用户组生效，不要改成长期使用宽松的 Socket 权限。

## 三、登录 Web 管理端

管理端默认只监听服务器的 `127.0.0.1:3130`。在自己的电脑运行：

```bash
ssh -L 3130:127.0.0.1:3130 <服务器用户>@<服务器地址>
```

保持 SSH 连接，在本机浏览器打开 `http://127.0.0.1:3130`。在服务器部署目录读取管理密钥：

```bash
sed -n 's/^BOX_SERVER_MANAGER_TOKEN=//p' .env
```

管理密钥只保存在当前标签页；关闭标签页或点击“退出管理”后，下次需要重新输入。不要分享 `.env` 或包含密钥的截图。

## 四、数据库和启动顺序

1. 在“数据配置”选择 PostgreSQL：内置模式会联网拉取 PostgreSQL 16，外部模式需要填写并测试连接。
2. Redis 可以关闭、使用内置实例或连接外部服务。
3. 填写 Play、Creator 的地址与监听范围并保存。
4. 在“服务总览”启动游玩端、创作端或全部服务。

`.env` 是服主维护的唯一配置来源。保存配置和启动服务时，Rust 管理端会自动生成 `.runtime.env`；不要手工修改它。

必须长期保留 `.env`。内置 PostgreSQL 已有数据卷时也必须保留原 `.env` 中的数据库身份与密码。管理端检测到数据卷存在但原凭据缺失时会停止保存，不会生成无法登录的新账号。

## 五、网络边界

| 端口        | 用途               | 建议                                              |
| ----------- | ------------------ | ------------------------------------------------- |
| `3130`      | Web 管理端         | 手动安装只绑定本机；一键安装默认开放              |
| `3121`      | Play               | 面向玩家时通过 HTTPS 反向代理                     |
| `3125`      | 参考登录门户       | 使用时通过 HTTPS 反向代理                         |
| `3124`      | Player Service     | 不直接公开管理路由，按需由 HTTPS 网关代理玩家 API |
| `3127`      | Creator            | 只允许服主或可信创作者访问                        |
| `3123`      | VOXA               | 只允许 Creator 与可信创作者访问                   |
| `5432/6379` | PostgreSQL/Redis   | 只绑定 `127.0.0.1`                                |
| `9966-9967` | Creator 内部运行时 | 只绑定 `127.0.0.1`                                |

不要把 Docker Socket、数据库或 Redis 暴露到公网。一键安装开放 3130 是为了方便首次配置，长期使用应为管理端配置 HTTPS、VPN 或来源 IP 白名单。

## 六、资源与精简模式

Rust 管理端默认限制为 128 MB、0.5 CPU，实际空闲内存仅为数 MiB。默认还限制 Player Service 256 MB、参考门户 64 MB、PostgreSQL 512 MB、Redis 256 MB、VOXA 1 GB、Play 4 GB、Creator 6 GB；限制是上限，不会预先占用。

小服务器可以：

- 只启动“游玩端”，不启动 Creator 与 VOXA；
- 已有自己的登录页时，从 `COMPOSE_PROFILES` 删除 `auth-portal`；
- 保持 `BOX_PLAY_PREWARM_RUNTIMES=0` 与 `BOX_CREATOR_EDIT_PREWARM_RUNTIMES=0`；
- 根据实际并发降低运行时数量，不要盲目提高数据库连接池。

## 七、运维、备份和升级

```bash
./status.sh
./start.sh
./logs.sh server-manager
./logs.sh player-service
./logs.sh managed-postgres
./stop.sh
./install.sh
```

- `status.sh`：查看服务状态；
- `start.sh`：读取已有 `.env`，按 `COMPOSE_PROFILES` 启动服务；
- 只启动 Play 相关服务：`BOX_START_PROFILES=play,player-service,auth-portal,server-manager ./start.sh`（一次性覆盖，不修改 `.env`）；
- `logs.sh [服务名]`：查看并跟踪最近 300 行日志；
- `stop.sh`：停止服务，不删除数据卷、工程或备份；
- `install.sh`：重新校验镜像并恢复管理端，不覆盖已有配置。

升级前备份 `.env`、`apps/local-engine/projects/`、`apps/local-engine/play-worlds/`、`apps/voxa/data/`、`apps/local-engine/backups/`，并单独执行 PostgreSQL `pg_dump` 或数据库快照。页面文件备份不包含 PostgreSQL。

升级到新目录时，先停止旧部署，再复制上述配置与数据，然后执行新包的 `./verify.sh` 和 `./install.sh`。不要删除 `box-managed-postgres-data` 排障。

## 八、常见问题

| 现象                    | 检查方式                                                  |
| ----------------------- | --------------------------------------------------------- |
| 管理页面打不开          | 检查 SSH 隧道、`./status.sh`、`./logs.sh server-manager`  |
| 管理密钥无效            | 从当前目录 `.env` 重新读取，不要使用旧包的令牌            |
| Player Service 返回 503 | 查看 Player Service 与 PostgreSQL 日志                    |
| PostgreSQL role 不存在  | 恢复创建数据卷时的 `.env`，不要删除卷或生成另一组随机凭据 |
| 内置数据库镜像下载失败  | 检查网络、镜像源、代理和磁盘空间                          |
| 容器因内存不足退出      | 查看日志，按实际负载提高对应 `*_MEMORY_LIMIT`             |

管理容器通过 Docker Socket 控制本机 Docker，拥有该 Socket 等同于宿主机 root 级权限。只运行可信发行镜像并保护管理密钥。

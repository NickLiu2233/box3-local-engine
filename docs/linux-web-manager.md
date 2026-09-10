# Linux Web 管理端部署

Linux Web 管理端用于没有桌面环境的服务器。它由 Rust 提供 HTTP API，并与桌面启动器使用同一套页面、配置规则、许可证校验、服务编排和备份逻辑。浏览器通过独立的管理令牌登录，不需要在服务器上安装 Node.js。

服务器离线包包含 Creator、VOXA、Play、Player Service、参考登录门户和 Web 管理端六个服务镜像。包内还提供内置 PostgreSQL/Redis 的 Compose 定义，但不携带这两个基础镜像；选择内置模式时需要联网拉取，也可以连接已有的外部服务。Redis 可以关闭。

## 首次安装

要求 Linux amd64 或 arm64、Docker Engine 和 Docker Compose v2。先从 Release 下载与 CPU 架构一致的 `BOX3-Engine-Server-<版本>-linux-<amd64|arm64>.zip`，完整解压后进入目录：

```bash
chmod +x *.sh
./verify.sh
./install.sh
```

`verify.sh` 校验清单、文件哈希、镜像架构和归档完整性。`install.sh` 首次运行时会：

1. 从 `.env.example` 创建权限为 `0600` 的 `.env`；
2. 生成业务密钥、Web 管理令牌和许可证安装密钥；
3. 导入包内六个离线镜像；
4. 只启动 Web 管理端，业务服务仍由服主在页面中启动。

安装脚本不会覆盖已有 `.env`。升级或迁移部署时必须保留 `.env`、`license/` 和数据目录，否则设备 ID 会变化，已安装许可证也会失效。

### 从源码仓库启动

开发环境的根目录 `.env` 至少需要设置独立的 `BOX_SERVER_MANAGER_TOKEN`，长度不少于 32 个字符。建议同时设置固定的 64 位十六进制 `BOX_LICENSE_INSTALL_SECRET`，避免重建容器后设备 ID 改变。管理端默认只绑定本机：

```env
BOX_SERVER_MANAGER_BIND_IP=127.0.0.1
BOX_SERVER_MANAGER_PORT=3130
BOX_SERVER_MANAGER_TOKEN=<使用 openssl rand -hex 32 生成>
BOX_LICENSE_INSTALL_SECRET=<使用 openssl rand -hex 32 生成>
```

构建并启动：

```bash
pnpm server-manager
pnpm server-manager:up
docker compose --profile server-manager ps server-manager
```

修改前端或 Rust 管理端后重新执行前两条命令。只停止管理端可运行 `docker compose --profile server-manager stop server-manager`，不会停止其他业务容器。

## 登录管理页面

管理端默认只监听服务器的 `127.0.0.1:3130`。在自己的电脑建立 SSH 隧道：

```bash
ssh -L 3130:127.0.0.1:3130 <服务器用户>@<服务器地址>
```

保持该终端连接，在浏览器打开 `http://127.0.0.1:3130`。管理令牌位于服务器 `.env` 的 `BOX_SERVER_MANAGER_TOKEN`，不要复制到聊天、截图或公开日志中。

令牌只保存在当前浏览器标签页的 `sessionStorage`。关闭标签页，或点击侧边栏的“退出管理”，下次进入都必须重新输入令牌。

未登录时侧边栏只显示“管理登录”和“关于”。关于页仅公开基本产品信息和发行许可证全文；更新日志、服务组件、QQ群及诊断信息登录后才显示。许可证管理、配置、服务、运行容器和备份等入口也只会在管理密钥验证通过后显示。

首次登录后按以下顺序操作：

1. 在“许可证管理”复制设备 ID，申请并安装许可证；
2. 在“数据配置”选择 PostgreSQL 和 Redis 模式，填写访问地址、端口及容量；
3. 保存配置并完成连接检查；
4. 在“服务总览”启动创作端、游玩端或全部服务。

## 日常启动与运维

正常情况下容器设置了 `restart: unless-stopped`，主机重启后会自动恢复。需要手工检查或恢复时使用包内脚本：

```bash
./status.sh
./logs.sh server-manager
./logs.sh play
./stop.sh
./install.sh
```

- `status.sh` 查看所有容器状态；
- `logs.sh [服务名]` 跟踪最近 300 行日志；
- `stop.sh` 停止服务，不删除卷、工程、地图、许可证或备份；
- `install.sh` 校验完整包并启动 Web 管理端，已有配置不会被覆盖。

页面可以管理固定白名单内的五个业务服务和内置 PostgreSQL/Redis，不能执行任意 Compose 参数、文件路径或 shell 命令。服务状态查询与停止按 Docker 项目标签执行，即使业务配置暂时无效，仍可用于排障。

## 配置与网络

`.env` 是服主维护的唯一配置来源。启动业务服务前，管理端根据当前设置生成 `.runtime.env`，其中包含绑定地址、公开 URL、允许来源、数据库连接串和 Compose profile。不要手工修改 `.runtime.env`，它会被覆盖。

管理容器无法直接发现宿主机的局域网地址，`install.sh` 会把检测结果写入 `BOX_LAN_IP`。没有检测到时，在页面“公网 IP”中手工填写服务器地址。特殊挂载环境可在 `.env` 设置绝对路径 `BOX_SERVER_MANAGER_HOST_ROOT`；普通安装无需设置。

不要把 3130 直接暴露到公网。远程管理优先使用 SSH 隧道或 VPN；确需通过域名访问时，应在前方配置 HTTPS、额外身份认证、来源限制和防火墙。Player Service 管理接口、数据库和 Redis 同样不应直接公开。

## 数据库与 Redis

PostgreSQL 是玩家、权限、审计和地图脚本持久数据的必需存储。可以选择：

- 内置 PostgreSQL：管理端生成随机身份，从配置的镜像源拉取 PostgreSQL 16，并保存到 `box-managed-postgres-data`；
- 外部 PostgreSQL：填写地址、端口、数据库、账号、密码和 SSL 参数，并在保存前测试连接。

Redis 仅保存可重新生成的会话、限流和构建缓存，可以关闭、使用内置服务或连接外部服务。内置 PostgreSQL/Redis 端口只绑定宿主机 `127.0.0.1`。

## 备份与升级

页面可以创建、恢复、删除、上传和下载文件备份。新备份使用 `.tar.gz`，也兼容旧 `.zip`、`.tar` 和 `.tar.gz`；浏览器上传上限为 512 MB。

恢复会先完整校验归档，再停止业务服务并替换归档中包含的数据目录；空备份不会停止服务。恢复范围包括 Creator 工程、发布文件、Play 世界和 Voxa 数据，不包含 PostgreSQL。数据库必须另外使用 `pg_dump` 或服务商快照备份。

升级前至少保存 `.env`、`license/`、文件备份和 PostgreSQL 备份。将新包解压到新目录时，再复制这些持久数据并执行 `./verify.sh`、`./install.sh`。备份恢复带有失败回滚，但不保证断电原子性，应先在测试机验证重要备份。

## 常见问题

| 现象                 | 检查方式                                                                |
| -------------------- | ----------------------------------------------------------------------- |
| 页面打不开           | 确认 SSH 隧道仍连接，运行 `./status.sh` 和 `./logs.sh server-manager`   |
| 登录后立即返回登录页 | 重新读取当前 `.env` 中的管理令牌；旧令牌或前后空格会被拒绝              |
| Docker 显示未连接    | 确认 Docker Engine 正常，并检查管理容器的 Docker Socket 挂载            |
| 服务无法启动         | 先检查许可证、PostgreSQL 连接和页面显示的具体错误，再查看对应服务日志   |
| 内置数据库安装失败   | 检查服务器联网、镜像源、磁盘空间和 Docker 拉取日志                      |
| 升级后许可证失效     | 检查是否完整保留旧 `.env` 的 `BOX_LICENSE_INSTALL_SECRET` 和 `license/` |

更完整的变量和网络说明见[配置参考](./configuration-reference.md)与[部署和联机](./deployment.md)；数据边界见[本地基础设施](./local-infrastructure.md)。

## 安全边界

管理容器通过 `/var/run/docker.sock` 控制本机 Docker，拥有该 Socket 等同于拥有宿主机 root 级控制能力。只运行可信镜像，保护 `.env` 和管理令牌，不要把 Docker Socket 交给其他容器。只读根文件系统、`no-new-privileges` 和 capability drop 可以缩小容器攻击面，但不能降低 Docker Socket 自身的权限等级。

桌面端与 Web 端的文件操作按平台适配：桌面使用系统文件选择器，Web 使用浏览器上传下载；服务地址在 Web 中打开新标签页。底层配置、许可证、编排和备份规则由 `apps/manager-core` 共用。

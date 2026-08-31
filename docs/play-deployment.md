# 游玩端部署

Play 提供地图大厅、只读地图运行和多人连接。它只运行 Creator 发布的 `.boxplay` 快照，不包含地图编辑器，也不能修改地图的封面、标题、简介或作者。

## 选择部署方式

| 场景                           | 推荐方式                  | 是否需要源码     |
| ------------------------------ | ------------------------- | ---------------- |
| Windows、macOS、Linux 桌面电脑 | 对应平台桌面离线 ZIP      | 否               |
| 无图形 Linux x64/ARM64 服务器  | 对应架构无图形服务器 ZIP  | 否               |
| 本仓库开发与调试               | `pnpm play`               | 是               |
| 维护者手动部署预构建镜像       | `distribution/play/` 模板 | 需要取得镜像归档 |

桌面离线包已经包含 Play、Player Service 和参考登录门户镜像，普通用户不需要另行下载镜像。无图形服务器包还包含 Linux Web 管理端，不包含 Creator、VOXA 或内部迁移器。

## 源码启动

准备 `.env` 后执行：

```bash
pnpm play
```

该命令构建并启动 Play。已有镜像时：

```bash
pnpm play:up
```

默认入口：

```text
Play：http://127.0.0.1:3000/
Player Service：http://127.0.0.1:3213/
参考登录门户：http://127.0.0.1:3214/
```

Player Service 和登录门户可分别通过 `pnpm player-service`、`pnpm player-auth-portal` 构建，或用对应 `:up` 命令直接启动已有镜像。

## 必要配置

真实玩家部署必须配置 PostgreSQL，并为以下三项生成彼此不同的随机值：

```env
BOX_DATABASE_URL=postgresql://user:password@host:5432/database
PERMISSION_TOKEN_SECRET=<随机值>
BOX_PLAYER_AUTH_API_KEY=<随机值>
BOX_PLAY_ADMIN_TOKEN=<随机值>
```

可使用 `openssl rand -hex 32`。三个秘密的职责分别是运行时身份签名、登录后端调用认证 API、服主兑换临时管理会话。不要在升级时随意更换 `PERMISSION_TOKEN_SECRET`，否则会话失效，脚本中的稳定 `userKey` 也会变化。

常用地址与开关：

```env
BOX_PLAY_PUBLIC_URL=http://127.0.0.1:3000
BOX_PLAYER_SERVICE_PUBLIC_URL=http://127.0.0.1:3213
BOX_PLAYER_LOGIN_URL=http://127.0.0.1:3214
BOX_PLAYER_REGISTRATION_ENABLED=true
BOX_PLAY_LIBRARY_READ_ONLY=false
```

- `BOX_PLAYER_REGISTRATION_ENABLED=false` 会关闭注册 API；参考门户同步隐藏注册入口。
- `BOX_PLAY_LIBRARY_READ_ONLY=true` 会隐藏服主管理入口，并在服务端拒绝导入、删除和地图开关操作。
- `BOX_PLAYER_LOGIN_URL` 必须是玩家浏览器可以访问的真实登录地址，不能填容器内部主机名。
- 玩家、后台管理员和服主会话的边界见[玩家身份与权限](./player-identity.md)。

完整变量与默认值见[配置参考](./configuration-reference.md)。

## 导入和管理地图

Creator 发布的是一个 `.boxplay` 地图组包。Play 不会从 Creator 工程目录读取地图，也不会把 Docker 镜像装进地图包。

启用管理后：

1. 打开 Play 首页。
2. 进入“服主管理”，使用 `BOX_PLAY_ADMIN_TOKEN` 兑换临时服主会话。
3. 导入 `.boxplay`。
4. 等待主地图和全部副地图完成校验与安装。

Play 管理界面提供：

- 导入完整地图组；
- 查看主地图、副地图和当前在线人数；
- 临时关闭或开启整个地图组；
- 删除副地图或整个地图组。

Play 不提供地图包导出。地图关闭后不会显示在大厅，直接访问 `/p/<地图ID>` 也会被拒绝。地图资料需要修改时，由作者在 Creator 重新发布新版本。

地图默认存放在宿主机/发行目录的 `play-worlds/`，运行缓存和持久存储由 Compose 卷管理。新增地图不需要重建镜像。

## 地图组、在线人数与 Teleport

一个地图组由一个主地图和零到多个副地图组成。多个运行时、Teleport 私有房间以及副地图中的在线玩家都会汇总到所属地图。运行时离开或断线后会按服务端状态更新，不能依赖浏览器本地计数。

脚本可以调用 `world.teleport(mapId, players, serverId?)`。不指定 `serverId` 时会创建不公开展示的私有房间，只有被传送的登录玩家可以进入。

```env
BOX_PLAY_MAX_RUNTIMES=8
BOX_RUNTIME_IDLE_TIMEOUT_MS=900000
BOX_TELEPORT_MAX_ROOMS=64
BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS=900000
```

Teleport 房间仍计入 `BOX_PLAY_MAX_RUNTIMES`。低配服务器应降低并发运行时和预热数量，而不是只降低单地图人数。

## 预热与资源限制

Play 会为已安装地图生成持久预烘焙缓存。未变化地图在容器重启后可复用缓存。

```env
BOX_LOCAL_PLAYER_LIMIT=8
BOX_PLAY_MAX_RUNTIMES=8
BOX_PLAY_PREWARM_RUNTIMES=8
BOX_RUNTIME_START_TIMEOUT_MS=1800000
BOX_PLAY_MEMORY_LIMIT=4g
BOX_PLAY_CPU_LIMIT=4.0
```

`BOX_PLAY_PREWARM_RUNTIMES` 不应超过 `BOX_PLAY_MAX_RUNTIMES`，设为 `0` 可关闭常驻预热。2 核 2 GB 服务器只适合少量玩家和小地图，应显著降低运行时数量、预热数量和脚本堆上限，并保留系统和 PostgreSQL 的内存。

## 无图形 Linux 服务器

从 GitHub Release 下载与 CPU 匹配的服务器 ZIP：

- `linux-amd64`：主流 Intel/AMD x64 服务器；
- `linux-arm64`：ARM64 云服务器。

解压后：

```bash
chmod +x *.sh
./install.sh
./status.sh
./logs.sh play
```

`install.sh` 会导入包内 Play、Player Service、参考登录门户和 Linux Web 管理镜像，并在不存在时从 `.env.example` 创建 `.env`。它不会安装 PostgreSQL/Redis，也不会覆盖已有 `.env`。默认通过 `127.0.0.1:3130` 提供管理端；远程使用请建立 SSH 隧道，详见 [Linux Web 管理端](./linux-web-manager.md)。

命令行恢复操作：

```bash
./status.sh
./logs.sh
./stop.sh
```

该包不含地图。启动后仍需从服主管理界面导入 `.boxplay`。

## 维护者镜像模板

`distribution/play/` 是维护者和自管 Compose 的模板，不是 Creator 的导出结果。准备好同架构的 `play-image.tar` 与 `player-service-image.tar` 后，可执行：

```bash
cp .env.example .env
docker image load --input play-image.tar
docker image load --input player-service-image.tar
mkdir -p play-worlds
docker compose up -d
docker compose ps
```

发行版通常还包含登录门户镜像及校验文件，应按包内 README 和 `SHA256SUMS` 操作，不要把不同版本、不同架构的镜像归档混用。

`play-storage-init` 显示 `Exited (0)` 是正常的：它只负责初始化卷权限。退出码非零，或 Play 主容器没有进入运行状态，才表示启动失败。

## 局域网和公网

默认绑定 `127.0.0.1`，只能本机访问。局域网访问可绑定 `0.0.0.0`，同时把 `BOX_PLAY_PUBLIC_URL`、Player Service 和登录门户地址改成玩家实际访问的 IP 与端口。

公网部署应：

1. 只通过 HTTPS 反向代理公开 Play、登录门户和必要的 Player Service 认证 API。
2. 转发 WebSocket Upgrade。
3. 不公开 PostgreSQL、Redis、Docker API 和 Player Service 管理页面。
4. 只有反向代理会清洗客户端转发头时才设置 `BOX_TRUST_PROXY=true`。
5. 将登录页、Play、Player Service 放在同一主域的 HTTPS 子域，以便安全共享 Cookie。

示例 Nginx 片段：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

更多网络说明见[部署与联机](./deployment.md)。

## 更新、备份和排障

更新镜像前备份：

- `.env`；
- `play-worlds/`；
- Play 的存储卷和缓存中需要保留的数据；
- PostgreSQL 数据库（使用经验证的快照或 `pg_dump`）；
- Redis 持久化数据（若业务依赖）。

地图包和镜像备份不包含 PostgreSQL。替换镜像时保留原 `.env`，确认镜像版本与架构后重新创建服务。

基础检查：

```bash
docker compose ps
docker compose logs --tail=200 play
docker compose logs --tail=200 player-service
curl http://127.0.0.1:3000/api/health-check
curl http://127.0.0.1:3000/api/play-worlds
```

常见问题：

| 现象                  | 检查                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| 已登录仍循环跳转      | `BOX_PLAYER_LOGIN_URL`、公开 URL、Cookie Domain、协议和浏览器实际地址是否一致 |
| 首页没有服主管理      | `BOX_PLAY_LIBRARY_READ_ONLY` 是否为 `true`，管理 token 是否配置               |
| 关闭注册后仍显示注册  | Portal 与 Player Service 是否都已用新环境变量重新创建                         |
| 地图导入失败          | `.boxplay` 是否完整、磁盘空间、`play-worlds/` 权限和 Play 日志                |
| 地图首次进入很慢      | 预热是否完成、CPU/内存是否不足、资源是否仍引用外部 OSS                        |
| 地图显示 0 人         | Player Service 会话、运行时上报、地图组/房间聚合日志                          |
| `storage-init` 已退出 | `Exited (0)` 正常；查看 Play 主容器状态                                       |

不要用删除卷、清空数据库或重建 `play-worlds/` 作为第一步排障。

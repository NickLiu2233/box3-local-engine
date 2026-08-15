# Box Local Engine 安装、部署与使用手册

本文是交付给创作者、服主和维护者的统一入口。按本文操作即可完成单机创作、模型编辑、
玩家服务、多地图游玩和公网部署；不需要了解原 `boxes` 在线平台的 Nacos、RabbitMQ 或
Kubernetes 架构。

## 1. 产品与部署边界

Local Engine 保留 `boxes` 的工程 schema、预烘焙、编辑器、浏览器引擎和权威 game-server，
仅在平台依赖处使用本地 adapter。

| 产品 | 默认地址 | 数据 | 是否公开 |
| --- | --- | --- | --- |
| Creator 创作端 | `http://127.0.0.1:3002/` | 可编辑工程、发布版本和备份 | 否，仅本机或可信内网 |
| Play 游玩端 | `http://127.0.0.1:3000/` | 只读发布地图和玩家存档 | 可以，经 HTTPS 反向代理 |
| Player Service | `http://127.0.0.1:3213/` | 玩家身份、账号、会话和审计 | 管理页不应直接公开 |
| VOXA | `http://127.0.0.1:3001/` | 本地模型、皮肤和可编辑工程 | 否，仅本机 |
| Migrator | `http://127.0.0.1:3212/` | 临时迁移缓存 | 否，仅按需启动 |

这些是独立镜像。Creator 和 Play 共用 Player Service，但 Play 镜像不包含登录、注册或玩家
后台；VOXA 也不需要与 Play 一起部署。

Player Service 的发布镜像会在构建阶段物理移除 Creator、Play、编辑器和地图管理路由，而不只是
在运行时返回 404。各服务容器默认启用 `no-new-privileges` 并移除 Linux capabilities，降低
容器被利用后的权限范围。

## 2. 最低要求

- macOS、Linux，或支持 Linux 容器的 Windows；
- Docker Desktop，或 Docker Engine + Compose v2；
- Node.js 20 或更高版本；
- Corepack 和 pnpm 10.12.1；
- 首次构建建议至少 20 GB 可用空间和 8 GB 内存。

检查环境：

```bash
docker version
docker compose version
node --version
corepack enable
pnpm --version
```

Apple Silicon 本机测试可以使用 `linux/arm64`。准备交付给常见 x86_64 Linux 服务器的
Play 镜像时使用 `linux/amd64`；架构不同的镜像不能直接混用。

### 中国大陆网络的镜像源

如果构建日志长时间停在 `docker.io/library/node`，可在 `.env` 中只替换基础镜像来源：

```env
BOX_DOCKER_NODE_IMAGE=docker.m.daocloud.io/library/node:22.17.0-bookworm-slim
```

Compose 会把该值传给所有镜像的 `NODE_IMAGE` 构建参数，不需要修改 Dockerfile。代理地址可以
由部署者替换，但 `node:22.17.0-bookworm-slim` 的版本和 Debian 变体必须保持一致，避免原生
依赖或 Node 行为发生变化。该配置只解决基础镜像拉取；pnpm 仍按仓库 `.npmrc` 使用配置的
npm registry。

国内代理不是项目自身的服务，可能随时下线或缺少某个标签。维护者发布前必须执行一次镜像元数据
或实际构建检查；代理不可用时可临时改回 `node:22.17.0-bookworm-slim`，不要改 Node 版本来
绕过拉取问题。

## 3. 第一次安装

```bash
git clone <仓库地址> box-local-engine
cd box-local-engine
corepack enable
pnpm install --frozen-lockfile
cp .env.docker.example .env
pnpm check
```

`.env` 是部署者自己的配置，包含密码和签名密钥，不能提交到 Git，也不能随地图包分发。

至少生成一个长期固定的会话密钥：

```bash
openssl rand -hex 32
```

把结果写入：

```env
PERMISSION_TOKEN_SECRET=上一步生成的值
```

地图运行时内存也由服主在 `.env` 中配置，默认值适合常见地图和
`512x256x512` 的大型体素地图：

```env
BOX_SCRIPT_MEMORY_MB=512
BOX_SCRIPT_HEAP_MB=512
```

这两个值都是“每个已启动地图运行时”的 MiB 上限，不是整个 Docker 容器的总内存。
`BOX_SCRIPT_MEMORY_MB` 是当前 `ivmp` 执行路径实际使用的主要限制；建议两项保持一致。
降低后如果出现 `Array buffer allocation failed`，应恢复为 `512` 或继续提高。修改后需
重新创建 Creator、Play 容器；通过本项目的 `pnpm creator` / `pnpm play` 命令也会自动完成。

运行时首次预烘焙、后台预热和空闲回收可由服主配置：

```env
BOX_CREATOR_EDIT_MAX_RUNTIMES=6
BOX_CREATOR_PLAY_MAX_RUNTIMES=4
BOX_PLAY_MAX_RUNTIMES=8
BOX_CREATOR_EDIT_PREWARM_RUNTIMES=6
BOX_CREATOR_PLAY_PREWARM_RUNTIMES=4
BOX_PLAY_PREWARM_RUNTIMES=8
BOX_RUNTIME_IDLE_TIMEOUT_MS=900000
```

预热数量不能超过对应运行时上限，设为 `0` 可关闭。Creator 默认预热最近编辑和预览工程各
一个；Play 默认优先预热一个主地图。预烘焙 blob 与 Build Cache 位于持久运行时缓存，不写入
只读地图目录；运行时空闲回收、Play 容器重启后仍可复用。地图内容、共享资源或引擎版本变化时，
构建参数随之变化，旧缓存不会被错误复用。

游玩运行时直接读取只读发布资源，只把派生数据写到缓存层，不再在每次冷启动时复制整份地图。
Docker 部署的缓存随 Creator 工程卷或 Play 的 `box-play-storage` 卷持久化。

更换该值会让已有运行时身份断言失效，并改变账号的 `entity.player.userKey`，因此完成正式部署后不要
随意轮换。

## 4. 数据库和 Redis

### PostgreSQL

Player Service 必须使用 PostgreSQL。地图脚本的 `getDataStorage` 和 `getGroupStorage` 也可
使用同一个 PostgreSQL 实例，但分别位于 `box_identity` 与 `box_engine` schema。

使用服主自己的数据库：

```env
BOX_DATABASE_URL=postgresql://用户名:密码@数据库地址:5432/数据库名
BOX_DATABASE_SCHEMA=box_engine
BOX_IDENTITY_DATABASE_SCHEMA=box_identity
BOX_DATABASE_SSL=false
BOX_DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

生产数据库建议启用 SSL。只有数据库明确使用无法验证的自签名证书时，才考虑关闭证书验证。

也可以使用仓库自带的本机 PostgreSQL 和 Redis：

```env
BOX_POSTGRES_PASSWORD=请设置强密码
BOX_REDIS_PASSWORD=请设置强密码
BOX_DATABASE_URL=postgresql://box:同一个PostgreSQL密码@postgres:5432/box
REDIS_HOST=redis
REDIS_PASSWORD=同一个Redis密码
```

然后执行：

```bash
pnpm infra
```

### Redis

Redis 是可选的。启用后用于跨进程 Session、会话限流、预烘焙热缓存和构建去重；不可用时
会回退到进程内 Session 和本地构建缓存。单机小服可以不配置。

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=请设置密码
REDIS_DB=0
STORAGE_CACHE_REDIS_DB=1
STORAGE_CACHE_REDIS_TTL=240
```

`STORAGE_CACHE_REDIS_TTL` 必须是 `0` 到 `255` 的整数。业务 DB 和缓存 DB 应分开。

## 5. 推荐启动顺序

### 创作者工作站

首次或代码更新后：

```bash
pnpm player-service
pnpm voxa
pnpm creator
```

镜像未变化时快速启动：

```bash
pnpm player-service:up
pnpm voxa:up
pnpm creator:up
```

打开：

- Creator：`http://127.0.0.1:3002/`
- Player Service：`http://127.0.0.1:3213/`
- VOXA 模型库：`http://127.0.0.1:3001/library`

### 游玩服务器

首次或 Play 引擎代码更新后：

```bash
pnpm player-service
pnpm play
```

以后直接启动：

```bash
pnpm player-service:up
pnpm play:up
```

停止全部产品但保留数据：

```bash
pnpm stop
```

不要执行 `docker compose down --volumes`，除非确认要删除内置 PostgreSQL、Redis 和 Play
本地存储 volume。

## 6. 创作、发布和分发

1. 在 Creator 首页新建或导入 `.boxproject`；
2. 打开编辑器，等待统一加载页进入地图；
3. 修改地图、脚本、UI 和资源后保存；
4. 在作品管理器填写版本号并发布；
5. 导出 `.boxproject` 交给可信创作者，或导出游玩部署包交给服主。

两类包不能混用：

| 产物 | 包含可编辑源工程 | 用途 |
| --- | --- | --- |
| `.boxproject` | 是，包含完整地图组 | 换设备、备份、继续编辑 |
| `.boxplay` / 游玩部署包 | 否，包含完整地图组的只读版本 | 一次安装到 Play 并提供给玩家 |

Creator 工程位置：

```text
apps/local-engine/projects/<project-id>/
  project.json
  source/
  releases/<version>/
```

不要手工修改 `project-state.json`、`blobs/` 或内容 hash。使用网页导入、导出、快照恢复和
备份功能。

### 项目模型和皮肤

- Local 是 VOXA 本机素材库；
- Project 只包含当前地图实际引用的模型与皮肤；
- 把 Local 模型放入地图并保存后，它才成为 Project 素材；
- Project 素材随工程和发布版本打包，不在 Play 运行时请求云端；
- 未设置项目默认皮肤时，运行态沿用工程人物外观，不读取其他项目的默认皮肤。

VOXA 源工程用于继续编辑；发布地图只依赖已经写入当前工程 blob 的运行文件。

## 7. 多地图 Play

Play 从宿主机目录读取地图：

```text
apps/local-engine/play-worlds/
  island/
    manifest.json
    data/
  city/
    manifest.json
    data/
```

访问 `/p/island` 或 `/p/city`。运行期间可以继续添加完整地图目录，通常数秒内会被发现，
无需重建镜像。为避免扫描到复制一半的目录，先复制到临时名称，完成后再原子改名为地图 ID。

如需网页服主管理：

```env
BOX_PLAY_ADMIN_TOKEN=至少16位随机值
BOX_PLAY_LIBRARY_READ_ONLY=false
```

默认应保持只读；只有确实需要在网页导入、删除地图时才开启写入。

## 8. 玩家身份与数据空间

Player Service 是玩家身份的唯一写入者。Creator 和 Play 只消费它签发的运行时身份。

- `entity.player.id`：当次连接实体 ID，会变化；
- `entity.player.userKey`：账号的稳定伪名键，推荐作为存档键；
- `entity.player.userId`：注册账号的 PostgreSQL ID；未登录玩家无法建立游戏会话；
- `entity.player.boxId`：本地唯一用户名；
- `entity.player.name`：显示昵称。

地图存储语义：

- `getDataStorage` 按不可变 Map UUID 隔离，修改玩家访问 ID 不会切换存档；
- `getGroupStorage` 固定按主地图 UUID 隔离，同一地图组共享、不同地图组隔离，不允许使用
  全局环境变量覆盖；
- Creator 的 `edit` 数据和 Play 的 `play` 数据默认隔离。

不要使用昵称、IP 或 `entity.player.id` 作为永久存档键。

## 9. 公网部署

只公开 Play 的 HTTP 端口。使用 Nginx、Caddy 或网关终止 HTTPS，并转发 HTTP 和 WebSocket
Upgrade 到 `3000`：

```env
BOX_PLAY_HOST_IP=127.0.0.1
BOX_PLAY_PORT=3000
BOX_SERVER_PUBLIC_URL=https://play.example.com
BOX_TRUST_PROXY=true
```

只有反向代理会覆盖并清洗 `X-Forwarded-For`、`X-Forwarded-Host` 和
`X-Forwarded-Proto` 时，才能设置 `BOX_TRUST_PROXY=true`。直连时保持 `false`。

不要公开 Creator 的 `3002`、编辑运行时 `9967`、本机预览 `9966`、VOXA `3001` 或未加
访问控制的玩家管理页。

## 10. 健康检查与排错

查看容器：

```bash
docker compose ps
docker compose logs --tail=200 creator
docker compose logs --tail=200 play
docker compose logs --tail=200 player-service
docker compose logs --tail=200 voxa
```

Play 部署会包含一次性的 `play-storage-init`。它负责兼容旧 volume 或 Linux 主机上由 root
创建的挂载目录，成功后显示 `Exited (0)`，这不是服务异常；随后 Play 才会启动。

健康接口：

```text
Creator/Play/Player Service: /api/health-check
VOXA:                       /api/health-check
Creator 详细状态:           /system
```

常见问题：

| 现象 | 检查 |
| --- | --- |
| Docker API 无法连接 | 启动 Docker Desktop，重新执行命令 |
| Player Service 不健康 | `BOX_DATABASE_URL`、网络白名单、账号权限和 SSL |
| 首次进入地图较慢 | 查看加载进度和 runtime 日志；大型工程首次需要预烘焙 |
| WebSocket 失败 | 反向代理是否转发 Upgrade，公网 URL 是否为 HTTPS |
| 资源 404 | 发布包的 `data/blobs` 是否完整，是否手工复制了半成品 |
| Redis 进入 fallback | Redis 地址、密码和 DB；单机仍可继续运行 |
| 默认皮肤串图 | 日志中的 `container =` 必须是当前项目 ID，不能为空 |
| `STORAGE_CACHE_REDIS_TTL must be uint8` | 改为 `0..255`，推荐 `240` |

## 11. 备份与升级

至少备份：

```text
apps/local-engine/projects/
apps/local-engine/backups/
apps/local-engine/play-worlds/
apps/voxa/data/
.env（安全保存，不进入普通备份分享包）
PostgreSQL 的 box_engine 与 box_identity schema
```

升级顺序：

1. 导出重要 `.boxproject`；
2. 备份 PostgreSQL 与上述目录；
3. 拉取指定发布版本，不直接跟随未知分支；
4. 执行 `pnpm install --frozen-lockfile && pnpm check`；
5. 重新构建有代码变化的独立镜像；
6. 检查 `/system` 和日志；
7. 用测试地图验证编辑、保存、运行、发布和 Play 进入。

镜像重建不会替代数据库和工程备份。

工程目录备份只覆盖地图工程和资源，不能替代 PostgreSQL 备份。正式服应由数据库服务或服主
定期执行 `pg_dump`（至少包含 `box_engine`、`box_identity`），并实际做一次恢复演练；Redis
只承担缓存和可回退会话状态，通常不作为唯一持久数据源。

## 12. 维护者发布检查

发布给其他人前必须执行：

```bash
pnpm check
pnpm check:edit-session
pnpm --filter @box-local/game-server check:default-skin-scope
pnpm --filter @box-local/voxa check:default-skin-scope
docker compose config
```

然后分别构建 Creator、Play、Player Service 和 VOXA，并用全新 `.env` 做一次干净安装。

构建命令会自动把根版本号、Git commit、UTC 构建时间和来源写入镜像/分发包的构建信息；CI
也可用 `BOX_BUILD_VERSION`、`BOX_BUILD_COMMIT`、`BOX_BUILD_DATE`、`BOX_BUILD_SOURCE`
显式覆盖。生成的信息不包含数据库连接串、签名密钥或其他环境变量。

公开分发前还必须由发行负责人确认版本号、发行状态、许可证文本和第三方依赖清单。当前仓库
仍标记为 developer preview 且使用专有许可证标识，这属于发布决策，不能由构建脚本自动决定。

维护原则见 [与 boxes 的能力边界](boxes-parity.md)。核心要求是：工程 schema、预烘焙和
协议行为保持同源；本地差异集中在 adapter；平台业务不进入引擎核心路径。

# 本地基础设施与可迁移能力

仓库的源码 Compose 支持把 PostgreSQL 与 Redis 作为可选基础设施：纯本地地图工程可在没有
Redis 的情况下运行，地图脚本的数据存储仅在配置 PostgreSQL 后启用。Player Service 的账号、
权限、封禁、登录与持久会话则以 PostgreSQL 为前提，面向真实玩家的部署必须配置 PostgreSQL。

这与图形化部署管理器的产品策略不同：启动器不会安装基础设施，并且要求服主填写远程 PostgreSQL；Redis 仍可选。请根据部署路径选择配置，详见[配置参考](./configuration-reference.md)。

## 快速启动

复制示例配置并修改密码：

```bash
cp .env.docker.example .env
pnpm infra
docker compose ps postgres redis
```

停止服务但保留数据：

```bash
pnpm infra:stop
```

PostgreSQL 和 Redis 使用 Docker named volume，容器重建不会清空数据。默认端口只绑定
`127.0.0.1`，不要把数据库端口直接暴露到公网。

## PostgreSQL：已经可用

PostgreSQL 已接入地图脚本的 `game.storage` 数据空间，可保存玩家存档、背包、任务状态、
排行榜等数据。使用 Compose 内置数据库时，在 `.env` 中配置：

```env
BOX_POSTGRES_PASSWORD=替换为强密码
BOX_DATABASE_URL=postgresql://box:替换为强密码@postgres:5432/box
```

然后同时启动基础设施和产品容器，例如：

```bash
pnpm infra
docker compose --profile creator up -d --no-build creator
```

也可以不启动仓库内的 PostgreSQL，直接把 `BOX_DATABASE_URL` 指向用户自己的数据库。连接串
非空时自动使用 PostgreSQL，留空时停用数据存储 API，不会写入本地数据文件。
完整的 schema、SSL、连接池、旧 boxes 数据表兼容和备份说明见
[PostgreSQL 数据空间部署手册](postgresql-data-storage.md)。

## Redis：可选的 Session 与构建缓存 adapter

`.env` 中可以配置 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`、`REDIS_DB` 和 storage
cache 相关字段。实现沿用 boxes 的职责边界：业务 DB 保存短期 Session 并执行跨实例创建
会话限流；缓存 DB 保存预烘焙/构建结果，并通过短期分布式锁避免多个运行时重复构建。

因此：

- 默认保持 `REDIS_HOST=`，单机运行仍不依赖 Redis；
- `REDIS_DB` 默认 `0`，用于一次性 Session 交接和每 IP 的创建会话限流；
- `STORAGE_CACHE_REDIS_DB` 默认 `1`，用于构建结果热缓存和并发构建去重；
- `STORAGE_CACHE_REDIS_TTL` 是构建热缓存秒数，必须在 `0` 到 `255` 之间；设为 `0` 可停用构建缓存；
- Redis 断线或启动时不可用会自动回退到内存 Session、内存限流和本地文件构建缓存，地图仍可启动；
- Redis 不保存 `getDataStorage/getGroupStorage` 数据，游戏存档只由已配置的 PostgreSQL 负责。

源码启动和 Docker Compose 都会读取仓库根目录 `.env`。运行状态页会显示业务 DB 与缓存 DB，
运行时 `/api/health-check` 还会报告两个 Redis adapter 当前是 `ready` 还是 `fallback`。

## 从 boxes 值得迁入的能力

| 能力                      | 当前状态                          | 本地化建议                                                       |
| ------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| PostgreSQL `game.storage` | 已实现                            | 保持可选，由服主通过 `.env` 提供连接                             |
| Redis session/限流/缓存   | 已实现                            | 默认使用本地 adapter，配置后支持跨实例且故障自动回退             |
| 内容寻址 blob 存储        | 已有本地 VOXA、工程资源和迁移缓存 | 补齐兼容 API 即可，不强制运行 IPFS daemon                        |
| 构建缓存持久化            | 已实现                            | 本地持久化缓存按作品隔离，Redis 提供跨实例热缓存与构建锁         |
| 健康检查/依赖状态         | 已实现                            | 状态中心显示创作端进程、工程运行时、数据库、缓存、可选服务和诊断 |
| 备份、恢复、工程迁移      | 已实现                            | 包含完整性校验、失败报告、快照恢复和可导入备份                   |
| 多地图运行隔离            | 已实现                            | 保持端口、进程、资源目录和数据 namespace 隔离                    |

不建议直接迁入 boxes 的线上账号、支付订单生产端、内容审核、封禁风控、Nacos、内部运营
后台和强绑定 OSS 的逻辑。这些属于平台业务，不是本地引擎运行所必需，照搬
会增加部署依赖，也会破坏离线可用性。

## 推荐的配置原则

- `.env` 只放部署差异和密钥，镜像内不写死数据库地址或密码；
- 浏览器端不能获得 `BOX_DATABASE_URL`、Redis 密码等服务端变量；
- 每个可选基础设施都必须有本地默认 adapter；
- 未接入的配置必须明确标注为预留，避免出现“配置了但实际上没生效”；
- 多作品共享数据库时继续使用作品 namespace 隔离数据。

## 运行状态中心与自动备份

创作端作品页的“运行状态”会真实探测 VOXA、PostgreSQL、Redis、磁盘空间以及每个
工程的编辑/游玩运行时。未配置的可选服务显示为“未启用”，不会被误报成故障；页面不会返回
数据库连接串或密码。

自动备份默认关闭。长期运行的创作服务器可以在 `.env` 中开启：

```env
BOX_AUTO_BACKUP_ENABLED=true
BOX_AUTO_BACKUP_INTERVAL_MINUTES=60
BOX_AUTO_BACKUP_RETENTION_COUNT=24
BOX_AUTO_BACKUP_RETENTION_DAYS=30
BOX_PROJECT_BACKUP_PATH=/app/apps/local-engine/backups
```

每份备份都是经过工程结构检查的 `.boxproject`，可以直接从作品管理器重新导入。备份任务会先
请求已打开的编辑器保存，然后按工程逐一生成；未初始化或内容未变化的工程会跳过，单个工程
失败不会中断其他工程。保留数量和保留天数会同时生效，任一条件超出即清理旧备份。

Docker Creator 会把 `apps/local-engine/backups` 挂载为持久目录。也可以在运行状态页点击
“立即备份全部工程”，并查看任务进度与逐工程失败信息。

## 数据维护

查看 named volume：

```bash
docker volume ls --filter name=box-local-engine
```

停止容器不会删除 volume。只有部署者明确执行 `docker compose down --volumes` 才会删除
数据库和 Redis 数据；执行前应先使用 `pg_dump` 备份 PostgreSQL。

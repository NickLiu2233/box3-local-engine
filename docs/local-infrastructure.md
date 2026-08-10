# 本地基础设施与可迁移能力

本地引擎默认使用零外部依赖模式。不开 PostgreSQL、Redis、RabbitMQ，也能创建、编辑和运行作品。
需要长期保存脚本数据或为后续多进程部署准备共享基础设施时，再由部署者通过 `.env`
显式开启相应服务。

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

PostgreSQL、Redis 和 RabbitMQ 使用 Docker named volume，容器重建不会清空数据。默认端口只绑定
`127.0.0.1`，不要把数据库端口直接暴露到公网。

## PostgreSQL：已经可用

PostgreSQL 已接入地图脚本的 `game.storage` 数据空间，可保存玩家存档、背包、任务状态、
排行榜等数据。使用 Compose 内置数据库时，在 `.env` 中配置：

```env
BOX_POSTGRES_PASSWORD=替换为强密码
BOX_DATA_STORAGE_DRIVER=postgres
BOX_DATABASE_URL=postgresql://box:替换为强密码@postgres:5432/box
```

然后同时启动基础设施和产品容器，例如：

```bash
pnpm infra
docker compose --profile creator up -d --no-build creator
```

也可以不启动仓库内的 PostgreSQL，直接把 `BOX_DATABASE_URL` 指向用户自己的数据库。
完整的 schema、SSL、连接池、旧 boxes 数据表兼容和备份说明见
[PostgreSQL 数据空间部署手册](postgresql-data-storage.md)。

## Redis：配置已开放，adapter 尚未接入

`.env` 中可以配置 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`、`REDIS_DB` 和 storage
cache 相关字段，Launcher 与 Docker 容器也会保留这些值。但当前 session、创建会话限流和
短期缓存仍使用单进程内存结构，尚不会读写 Redis。

因此：

- 默认保持 `REDIS_HOST=`；
- 单机运行不需要启动 Redis；
- `pnpm infra` 启动 Redis 只是为开发后续共享 adapter 提供环境；
- 在 adapter 完成前，不能依赖 Redis 实现多实例 session 共享、分布式限流或缓存恢复。

后续若要接入，应分别实现 session store、rate-limit store 和 cache store 接口，保留内存
adapter 作为默认值，而不是在业务代码里直接调用 Redis。

## RabbitMQ：boxes 消费端已接入，默认关闭

游戏服务保留了 boxes 的 RabbitMQ 客户端、断线重连、队列声明和消费者，当前支持：

- `user_offline_*`：跨游玩实例接收用户下线/踢出通知；
- `order_*`：接收商城支付成功消息并转换为脚本购买事件。

RabbitMQ 不负责玩家移动同步、编辑器协作、资源加载或数据持久化。仓库也不包含 boxes 线上
账号与订单系统的消息生产端；如果服主没有自己的生产端，启动 RabbitMQ 后队列会保持空闲。

使用内置 RabbitMQ 时，在 `.env` 中配置（连接串中的密码需要 URL 编码）：

```env
BOX_RABBITMQ_PASSWORD=替换为强密码
BOX_PAID_ACCESS=true
RABBITMQ_HOST_URL=amqp://box:替换为强密码@rabbitmq:5672
```

然后启动 RabbitMQ 和产品容器：

```bash
pnpm mq
pnpm creator:up
# 或 pnpm play:up
```

也可以不运行内置容器，直接把 `RABBITMQ_HOST_URL` 指向服主自己的 RabbitMQ。与 boxes
保持一致，游戏服务只有在生产构建中同时满足 `BOX_PAID_ACCESS=true` 和
`RABBITMQ_HOST_URL` 非空时才连接；默认值不会产生网络请求。管理界面只绑定宿主机
`127.0.0.1:15672`，不应直接暴露到公网。

## 从 boxes 值得迁入的能力

| 能力 | 当前状态 | 本地化建议 |
| --- | --- | --- |
| PostgreSQL `game.storage` | 已实现 | 保持可选，由服主通过 `.env` 提供连接 |
| Redis session/限流/缓存 | 未实现 | 通过 adapter 接入，默认继续用内存 |
| RabbitMQ 下线/商城事件 | 消费端已实现 | 默认关闭，由服主提供生产端并通过 `.env` 开启 |
| 内容寻址 blob 存储 | 已有本地 VOXA、工程资源和迁移缓存 | 补齐兼容 API 即可，不强制运行 IPFS daemon |
| 构建缓存持久化 | 部分实现 | 按作品和引擎版本隔离，允许配置缓存目录 |
| 健康检查/依赖状态 | 部分实现 | 在启动页显示作品加载、数据库和可选服务状态 |
| 备份、恢复、工程迁移 | 已有基础能力 | 继续补完整性校验、失败资源报告和版本迁移 |
| 多地图运行隔离 | 已实现 | 保持端口、进程、资源目录和数据 namespace 隔离 |

不建议直接迁入 boxes 的线上账号、支付订单生产端、内容审核、封禁风控、Nacos、内部运营
后台和强绑定 OSS 的逻辑。这些属于平台业务，不是本地引擎运行所必需，照搬
会增加部署依赖，也会破坏离线可用性。

## 推荐的配置原则

- `.env` 只放部署差异和密钥，镜像内不写死数据库地址或密码；
- 浏览器端不能获得 `BOX_DATABASE_URL`、Redis 密码等服务端变量；
- 每个可选基础设施都必须有本地默认 adapter；
- 未接入的配置必须明确标注为预留，避免出现“配置了但实际上没生效”；
- 多作品共享数据库时继续使用作品 namespace 隔离数据。

## 数据维护

查看 named volume：

```bash
docker volume ls --filter name=box-local-engine
```

停止容器不会删除 volume。只有部署者明确执行 `docker compose down --volumes` 才会删除
数据库和 Redis 数据；执行前应先使用 `pg_dump` 备份 PostgreSQL。

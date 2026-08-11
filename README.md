# Box Local Engine

Box Local Engine 是一个独立、本地优先的体素游戏引擎，提供创作端和游玩端，并附带可独立
部署的 VOXA 本地模型编辑器。

仓库可以独立安装、构建和运行，不依赖原始 `boxes` 工程、私有 npm 仓库、云端 CDN、
在线账号、Redis、RabbitMQ 或 BOX 内部服务。地图、默认人物、动画和基础运行资源均从本地
读取。

## 两种部署

| 产品 | 用途 | 一键部署 | 默认入口 |
| --- | --- | --- | --- |
| 创作端 | 管理、编辑、预览和发布作品 | `pnpm creator` | `/` |
| 游玩端 | 从固定目录提供多个只读作品 | `pnpm play` | `/` |
| VOXA | 制作和管理本地体素模型 | `pnpm voxa` | `http://127.0.0.1:3001/` |
| 云端迁移器 | 将云端工程 hash 导出为可编辑本地工程 | `pnpm migrator` | `http://127.0.0.1:3212/` |

每种形态都是一个完整部署。启动器会自动协调网页和所需运行时，使用者只选择创作端或
游玩端，不再分别构建、启动其他子项目。

游玩端只使用一个公开网页端口。创作端除网页端口外，还会在宿主机回环地址映射编辑和预览
运行时端口；这些端口只服务本机编辑器，不应向公网开放。

游玩端使用真正的 play-only 构建。编辑页面、项目管理接口、管理员实现和 Monaco 不会
进入玩家网页产物，并且游戏运行时只读取发布数据。它不是在完整创作端上隐藏几个按钮。

## 环境要求

- Node.js 20 或更高版本
- pnpm 10.12.1
- 或 Docker Engine/Desktop 与 Docker Compose

## 快速开始

克隆仓库后执行：

```bash
corepack enable
pnpm install
pnpm check
```

### 开始创作

开发时使用热更新：

```bash
pnpm dev
```

Docker 生产部署：

```bash
pnpm creator
```

需要制作体素模型时，再独立启动 VOXA：

```bash
pnpm voxa
```

打开：

- 创作端：<http://127.0.0.1:3002/>
- 游玩端：<http://127.0.0.1:3000/>
- VOXA：<http://127.0.0.1:3001/>
- 云端迁移器：<http://127.0.0.1:3212/>

### 迁移云端工程

迁移器是独立镜像，不会读取或写入创作端的项目目录。优先在 `.env` 配置与 `boxes`
`GoIPFSStore` 一致的内容 API，例如 `BOX_MIGRATOR_CONTENT_API_URL=https://content-api.example.com`
（自动请求 `/block/get?arg=<hash>`）；也可配置静态地址
`BOX_MIGRATOR_CONTENT_URL=https://cdn.example.com/block/{hash}`。体素模型会先读取 IPFS，失败后按
`BOX_MIGRATOR_OSS_URL/engine/m/<hash>` 回退，并继续复制模型元数据引用的 `dataHash`。私有服务可再配置
`BOX_MIGRATOR_AUTHORIZATION`。然后启动：

```bash
pnpm migrator
```

在网页输入地图工程 hash，下载生成的 `.boxproject`，再从创作端“导入工程”导入。迁移的是当前
工程及其引用的内容资源，不包括账号、协作关系、评论、统计和发布历史。

每个作品都有独立工程目录。作品管理器负责创建、导入、编辑、发布和导出，不需要手动操作
工程中的 `source/`、`releases/` 或 blob 文件。选择作品后，管理器会打开对应的
`/e/<project-id>` 编辑地址或 `/p/<project-id>` 预览地址。

### 部署游玩端

在作品管理器中先发布版本，再选择“导出游玩部署包”。服主进入导出目录后只需执行：

```bash
docker load -i play-image.tar
docker compose up -d
```

游玩部署包已经绑定具体作品版本，并且只开放一个玩家网址。网页、地图资源和多人连接都走
同一个端口。普通玩家不需要安装引擎，也不会获得可重新导入编辑器的工程包。完整流程参阅
[本地工程与发布包](docs/projects.md)。

## 一键部署

复制配置模板：

```bash
cp .env.docker.example .env
```

部署创作端：

```bash
pnpm creator
```

该命令只构建创作端，不会构建游玩端。

创作端网页使用 `127.0.0.1:3002`。编辑和本机预览的 WebSocket 分别使用仅绑定本机的
`127.0.0.1:9967` 与 `127.0.0.1:9966`，不会暴露到局域网或公网。

游玩端默认使用 `3000`，因此可以和创作端、VOXA 同时运行。

镜像已经构建过，只启动创作端、不重新构建：

```bash
pnpm creator:up
```

启动多作品游玩端：

```bash
pnpm play
```

该命令只准备并启动游玩端，不会构建创作端。

地图放在 `apps/local-engine/play-worlds/<地图ID>/`，目录内必须包含发布产物的
`manifest.json` 和 `data/`。例如地图 ID 为 `island` 时，玩家地址是
`http://127.0.0.1:3000/p/island`。启动后可随时增加地图，不需要重新构建或重启。

例如已经在创作端发布了 `island@v1.0.0`，把整个发布目录复制到地图库：

```text
apps/local-engine/projects/island/releases/v1.0.0/
                         ↓ 整体复制
apps/local-engine/play-worlds/island/
```

只复制发布目录，不要复制可编辑的 `source/`。地图复制完整后，游玩端通常会在 3 秒内发现；
真正的游戏运行时会在玩家首次访问该地图时启动。

### 镜像打包后增加地图

可以。Docker 镜像只包含游玩引擎，地图通过宿主机目录只读挂载，不在镜像内部。即使镜像
已经构建并分发，也可以继续向宿主机的 `play-worlds/` 加入地图：

```text
play-worlds/
  island/
    manifest.json
    data/
  city/
    manifest.json
    data/
```

加入 `city` 后直接访问 `/p/city`，不需要重新构建镜像或重启容器。首页 `/` 会自动显示
所有有效地图。私服主只有镜像 tar、没有本仓库时，应使用
[部署与联机指南](docs/deployment.md#只分发镜像的多地图部署)中的 Compose 配置。

需要在网页中管理地图时，可以配置 `BOX_PLAY_ADMIN_TOKEN` 和
`BOX_PLAY_LIBRARY_READ_ONLY=false`。服主在首页验证后即可导入、导出 `.boxplay` 游玩包
或删除地图。默认不配置密钥，管理接口不会开放。

停止当前部署：

```bash
pnpm stop
```

同一台电脑上默认不要同时启动两种模式，因为它们通常使用相同的网页端口。创作工程保存在
宿主机 `apps/local-engine/projects/`；游玩端只读挂载 `apps/local-engine/play-worlds/`，
不会挂载作品的 `source/` 目录。

游玩镜像不会包含本机创作工程、可编辑导出包、环境变量文件、证书、Source Map 或
TypeScript 源文件。浏览器仍会取得渲染当前游戏所必需的模型、贴图、音频和压缩 JavaScript，
因此发布隔离不能替代权威运行时中的规则保护。

完整配置、局域网连接和 HTTPS/WSS 反向代理说明参阅
[部署与联机指南](docs/deployment.md)。

VOXA 的独立镜像、数据备份和创作端接入参阅
[VOXA 本地模型编辑器构建与部署手册](docs/voxa-deployment.md)。

可选 PostgreSQL、Redis 开发环境及从 boxes 迁移能力的边界参阅
[本地基础设施与可迁移能力](docs/local-infrastructure.md)。默认模式不依赖这些服务。

## 常用配置

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `BOX_PLAY_PORT` | `3000` | 游玩端公开端口 |
| `BOX_CREATOR_PORT` | `3002` | 创作端本机端口 |
| `BOX_WORLD_NAME` | `BOX 世界` | 玩家看到的世界名称 |
| `BOX_LOCAL_PLAYER_LIMIT` | `8` | 最大玩家数 |
| `PERMISSION_TOKEN_SECRET` | 空 | 正式部署使用的稳定随机密钥 |
| `BOX_SERVER_PUBLIC_URL` | 空 | 公网反向代理后的完整 HTTPS 地址 |
| `BOX_TRUST_PROXY` | `false` | 仅在可信反向代理后启用转发请求头 |
| `BOX_SESSION_TTL_MS` | `60000` | 未连接玩家 Session 的有效时间 |
| `BOX_SESSION_RATE_LIMIT_PER_MINUTE` | `60` | 每个 IP 每分钟创建 Session 上限 |
| `BOX_DATABASE_URL` | 空 | 服主自己的 PostgreSQL 连接串；填写后自动启用，只进入服务端 |
| `BOX_DATA_STORAGE_NAMESPACE` | 空 | 迁移旧数据时填写原作品 ID，沿用旧式双表表名 |
| `REDIS_HOST` | 空 | Redis adapter 预留；当前保持为空，不会自动启用缓存 |
| `BOX_PAID_ACCESS` | `false` | 与 boxes 一致，允许启用商城事件等付费能力 |
| `RABBITMQ_HOST_URL` | 空 | RabbitMQ AMQP 连接串；需与 `BOX_PAID_ACCESS=true` 同时设置 |

公网部署时把域名反向代理到 `BOX_PLAY_PORT`，允许 WebSocket Upgrade，并填写
`BOX_SERVER_PUBLIC_URL=https://你的域名`。只有反向代理会覆盖并清洗
`X-Forwarded-For/Host/Proto` 时才设置 `BOX_TRUST_PROXY=true`。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动创作端开发环境 |
| `pnpm creator` | 只构建并部署创作端 |
| `pnpm creator:up` | 直接启动已有创作端镜像，不重新构建 |
| `pnpm play` | 只准备并启动游玩端，自动发现地图目录中的作品 |
| `pnpm infra` | 启动可选的本地 PostgreSQL 和 Redis 容器 |
| `pnpm infra:stop` | 停止可选基础设施但保留数据 volume |
| `pnpm mq` | 启动可选的本地 RabbitMQ 和管理界面 |
| `pnpm mq:stop` | 停止 RabbitMQ 但保留消息数据 volume |
| `pnpm stop` | 停止当前 Docker 部署 |
| `pnpm check` | 检查独立依赖、离线资源和本地运行约束 |
| `pnpm check:edit-session` | 检查本地创作会话 |
| `pnpm project:package -- <作品>@<版本>` | 导出不含工程源目录的服主分发包 |

维护者如需只构建或直接运行源码产物，仍可使用
`build:creator`、`start:creator`、`build:play` 和 `start:play`。这些是内部调试入口，
普通创作者和服主不需要组合使用。

## 目录结构

```text
apps/game/             浏览器界面实现
apps/local-engine/     创作端/游玩端构建、启动和本地数据管理
services/game-server/  内部权威游戏运行时
packages/              随仓库分发的引擎模块
internals/             随仓库分发的内部基础模块
docs/                  创作、发布与部署文档
```

所有 `@box-local/*` 依赖都是本仓库内的 workspace 模块。完成安装后，运行游戏不需要连接
BOX 的服务器或 CDN。

## 当前范围

当前支持：

- 独立本地工程的创建、编辑、导入和导出
- 将工程发布为不可变的只读游玩快照
- 创作端本机预览
- 游玩端多人连接
- 默认人物和基础资源本地化
- 创作端和游玩端的生产构建及 Docker 部署

当前不包含云端工程同步、多人协作编辑、玩家账号系统、服务器列表、精细访问控制、跨地图
传送或 Mod 市场。创作端没有公网身份验证，不应直接暴露到不可信网络。

## 更多文档

- [创作端构建与部署手册](docs/creator-deployment.md)
- [游玩端构建、分发与多地图部署手册](docs/play-deployment.md)
- [部署与联机指南](docs/deployment.md)
- [作品创建、编辑与发布](docs/projects.md)
- [本地工程与发布包](docs/projects.md)
- [Local Engine 启动器](apps/local-engine/README.md)
- [浏览器界面内部说明](apps/game/README.md)
- [游戏运行时内部说明](services/game-server/README.md)
- [PostgreSQL 数据空间部署手册](docs/postgresql-data-storage.md)
- [与 boxes 的能力边界](docs/boxes-parity.md)

## 许可证

仓库当前标记为 `UNLICENSED`。在正式确定开源许可证和第三方资源授权之前，仅建议用于
内部演示或受控测试，不建议直接公开分发。

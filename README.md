# Box Local Engine

Box Local Engine 是一个独立、本地优先的体素游戏引擎 MVP，包含本地创作端、浏览器玩家
客户端、专用游戏服务器、默认世界和离线资源。

仓库可以独立安装、构建和运行，不依赖原始 `boxes` 工程、私有 npm 仓库、云端 CDN、
在线账号、Redis、RabbitMQ 或 BOX 内部服务。第三方依赖从公共 npm 仓库安装，地图、默认
人物、动画和基础运行资源从本地读取。

## 当前运行形态

| 模式 | 用途 | 构建 | 启动 | 默认入口 |
| --- | --- | --- | --- | --- |
| 本地一体模式 | 本机创作和测试 | `pnpm build` | `pnpm start` | `/e/local`、`/p/local` |
| 玩家客户端 | 连接远程专用服务器 | `pnpm build:client` | `pnpm start:client` | `/connect` |
| 专用服务器 | 部署可供玩家连接的世界 | `pnpm build:server` | `pnpm start:server` | `:9966` |

玩家客户端是实际的 player-only 构建：创作界面、管理员实现和 Monaco 不会进入玩家运行
产物，而不是打包后再隐藏。专用服务器只提供游玩服务，不会启动或公开创作端。

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

`corepack enable` 用于启用 Node.js 自带的包管理器版本代理，让项目使用
`package.json` 指定的 pnpm 版本。

### 本地创作和游玩

开发时使用热更新：

```bash
pnpm dev
```

生产构建运行：

```bash
pnpm build
pnpm start
```

打开：

- 创作端：<http://127.0.0.1:3000/e/local>
- 游玩端：<http://127.0.0.1:3000/p/local>

本地一体模式会启动：

- 网页客户端：`3000`
- 游玩服务器：`9966`
- 仅限本机使用的创作服务器：`9967`

### 分离部署客户端和服务器

服务器电脑：

```bash
pnpm build:server
pnpm start:server
```

玩家电脑：

```bash
pnpm build:client
pnpm start:client
```

玩家打开 <http://127.0.0.1:3000/connect>，输入可访问的服务器地址，例如：

```text
http://192.168.1.20:9966
```

也可以预设服务器：

```bash
BOX_REMOTE_SERVER_URL=http://192.168.1.20:9966 pnpm start:client
```

玩家客户端访问 `/e/...` 时会跳转回 `/connect`。连接成功后，客户端通过服务器地址请求
游客会话、建立 WebSocket，并从只读的 `/block/:hash` 接口下载世界资源。

## 常用配置

### 专用服务器

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `BOX_SERVER_HOST` | `0.0.0.0` | 监听地址 |
| `BOX_SERVER_PORT` | `9966` | HTTP 与 WebSocket 端口 |
| `BOX_SERVER_PUBLIC_URL` | 根据请求推断 | 玩家使用的公开地址 |
| `BOX_SERVER_DATA_PATH` | `apps/local-engine/data` | 世界和资源目录 |
| `BOX_SERVER_CONTENT_ID` | `0` | 当前世界 ID |
| `BOX_SERVER_NAME` | `BOX Dedicated Server` | 服务器名称 |
| `BOX_LOCAL_PLAYER_LIMIT` | `8` | 最大玩家数 |

局域网示例：

```bash
BOX_SERVER_PUBLIC_URL=http://192.168.1.20:9966 \
BOX_SERVER_NAME="我的世界" \
pnpm start:server
```

公网部署需要 HTTPS/WSS 反向代理，并正确设置 `BOX_SERVER_PUBLIC_URL`。完整配置和排错请
参阅[部署与联机指南](docs/deployment.md)。

### 玩家客户端

```bash
BOX_CLIENT_HOST=0.0.0.0 \
BOX_CLIENT_PORT=3000 \
BOX_REMOTE_SERVER_URL=http://192.168.1.20:9966 \
pnpm start:client
```

`BOX_REMOTE_SERVER_URL` 必须是玩家浏览器能够访问的局域网 IP 或公网域名，不能填写只在
Docker 网络内部可见的 `http://server:9966`。

## Docker

复制配置模板：

```bash
cp .env.docker.example .env
```

构建并启动：

```bash
docker compose build server client
docker compose up -d
```

也可以只部署一侧：

```bash
# 只部署服务器
docker compose up -d server

# 只部署玩家客户端
docker compose up -d client
```

启动后：

- 玩家连接页：<http://127.0.0.1:3000/connect>
- 服务器信息：<http://127.0.0.1:9966/api/server-info>

玩家镜像只复制 Next standalone 运行产物，不包含创作源码、Monaco、服务端和世界 blobs。
服务端世界数据保存在 Docker 命名卷 `box-local-engine_box-server-data` 中；普通的
`docker compose down` 不会删除该数据卷。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动本地热更新创作环境 |
| `pnpm build` | 构建创作端、玩家端和服务器 |
| `pnpm start` | 启动生产版本地一体模式 |
| `pnpm build:client` | 构建 player-only standalone 客户端 |
| `pnpm start:client` | 只启动玩家客户端 |
| `pnpm build:server` | 构建专用服务器 |
| `pnpm start:server` | 只启动专用服务器 |
| `pnpm check` | 检查独立依赖、离线资源和本地运行约束 |
| `pnpm check:edit-session` | 检查本地创作会话 |
| `pnpm sync:avatar` | 维护者联网更新默认人物资源 |

## 目录结构

```text
apps/game/             浏览器玩家客户端和本地创作界面
apps/local-engine/     构建脚本、启动器、配置、本地数据
services/game-server/  权威游戏服务器
packages/              随仓库分发的引擎模块
internals/             随仓库分发的内部基础模块
docs/                  部署与联机文档
```

所有 `@box-local/*` 依赖都是本仓库内的 workspace 模块。完成安装后，运行游戏不需要连接
BOX 的服务器或 CDN。

## MVP 范围

当前已经支持：

- 单个内置世界的本地创作和游玩
- 独立玩家客户端连接专用服务器
- 多名玩家连接同一游玩服务器
- 默认人物和基础资源完全本地化
- 生产构建和 Docker 分离部署

本地创作端不包含多人协作编辑、邀请链接、权限组、在线锁定、协作版本分支、云端同步
或远程发布流程。开发协作使用 Git。

尚未完成：

- 创建、管理和切换多个世界
- 将创作结果稳定保存并发布为可部署世界包
- Mod 打包、版本校验和分发
- 玩家账号、服务器列表和精细访问控制
- 桌面安装包和发行压缩包
- 跨地图传送

## 更多文档

- [部署与联机指南](docs/deployment.md)
- [玩家客户端说明](apps/game/README.md)
- [专用服务器说明](services/game-server/README.md)
- [本地启动器说明](apps/local-engine/README.md)

## 许可证

仓库当前标记为 `UNLICENSED`。在正式确定开源许可证和第三方资源授权之前，仅建议用于
内部演示或受控测试，不建议直接公开分发。

# 创作端构建与部署手册

本文面向需要安装、构建、运行或迁移 Box Local Engine 创作端的创作者和运维人员。
创作端用于管理作品、编辑地图、本机预览、发布版本以及导出工程或游玩部署包。它包含完整
编辑能力和可编辑工程数据，因此只能运行在创作者自己的电脑或可信内网中，不能直接公开给
普通玩家。

## 1. 创作端包含什么

创作端 Docker 镜像名默认为：

```text
box-local-engine-creator:0.1.0
```

它包含：

- 作品管理界面；
- 地图编辑器；
- 本机游玩预览；
- 本地游戏运行时；
- 作品创建、导入、导出、发布和删除接口；
- 运行编辑器所需的本地基础资源。

它不会把宿主机现有的作品工程打进镜像。作品和导出文件通过宿主机目录挂载：

```text
apps/local-engine/projects/   可编辑工程和发布版本
apps/local-engine/dist/       导出的工程包、部署包和镜像归档
```

重新构建镜像或删除容器不会删除这两个宿主机目录，但删除目录本身会造成数据丢失。

## 2. 环境要求

使用仓库命令构建时需要：

- Docker Desktop 或 Docker Engine；
- Docker Compose v2；
- Node.js 20 或更高版本；
- pnpm 10.12.1；
- 足够的磁盘空间和内存。

推荐至少预留 20 GB 可用磁盘空间。第一次构建需要下载基础镜像和依赖，耗时会明显长于后续
构建。构建过程中出现 `resolved`、`downloaded`、`added` 等 pnpm 进度属于正常下载过程。

确认环境：

```bash
docker version
docker compose version
node --version
pnpm --version
```

## 3. 第一次构建并启动

进入仓库根目录：

```bash
cd /path/to/local-engine
```

复制 Docker 配置模板：

```bash
cp .env.docker.example .env
```

构建并启动创作端：

```bash
pnpm creator
```

这条命令会依次完成：

1. 只构建 `box-local-engine-creator` 镜像；
2. 停止可能占用同一端口的游玩端；
3. 停止并替换旧创作端容器；
4. 挂载宿主机的工程和导出目录；
5. 启动新的创作端容器。

它不会构建 `box-local-engine-play` 游玩镜像。

启动完成后打开：

```text
http://127.0.0.1:3002/
```

需要在创作端内制作体素模型时，VOXA 使用独立镜像和独立数据目录。首次执行：

```bash
pnpm voxa
```

已有 VOXA 镜像时执行 `pnpm voxa:up`。模型编辑器地址为
`http://127.0.0.1:3001/`，详细说明参阅
[VOXA 本地模型编辑器构建与部署手册](voxa-deployment.md)。

默认端口用途：

| 端口 | 用途 | 默认暴露范围 |
| --- | --- | --- |
| `3002` | 作品管理和编辑器网页 | 仅宿主机 `127.0.0.1` |
| `9966` | 创作端本机游玩预览 | 仅宿主机 `127.0.0.1` |
| `9967` | 创作端编辑会话 | 仅宿主机 `127.0.0.1` |

这三个端口都不应直接向公网开放。

### 创作端命令的区别

| 命令 | 是否构建 Docker 镜像 | 是否启动容器 | 适用场景 |
| --- | --- | --- | --- |
| `pnpm creator` | 是，只构建创作端 | 是 | 正常首次部署、代码更新后部署 |
| `pnpm creator:up` | 否 | 是 | 镜像已经存在且内容未变化 |
| `docker compose --profile creator build creator` | 是，只构建创作端 | 否 | 运维只想准备镜像 |
| `docker compose --profile creator up -d --no-build creator` | 否 | 是 | 直接运行 Compose 中指定的已有镜像 |
| `pnpm build:creator` | 否，生成本机源码生产产物 | 否 | 引擎维护者调试，不是普通 Docker 部署 |
| `pnpm start:creator` | 否 | 否，直接运行本机生产产物 | 引擎维护者调试 |

普通创作者优先使用前两条。单独执行 `pnpm build:creator` 不会得到 Docker 镜像，也不会启动
网页；它和 `pnpm creator` 不是同一层级的命令。

## 4. 只启动已有镜像

如果创作镜像已经构建完成，并且代码和镜像内容没有变化，可以直接启动：

```bash
pnpm creator:up
```

它不会重新构建镜像，因此速度很快。以下情况不能使用 `creator:up`：

- 拉取或修改了代码；
- 修复内容涉及网页、运行时或 Dockerfile；
- 修改了依赖或锁文件；
- 本机还没有创作端镜像；
- 当前镜像是旧版本。

这些情况下应重新执行：

```bash
pnpm creator
```

## 5. 常用配置

根目录 `.env` 示例：

```env
BOX_IMAGE_TAG=0.1.0
BOX_CREATOR_PORT=3002
BOX_LOCAL_PLAYER_LIMIT=8
PERMISSION_TOKEN_SECRET=
```

变量说明：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BOX_IMAGE_TAG` | `0.1.0` | 创作端和游玩端镜像标签 |
| `BOX_CREATOR_PORT` | `3002` | 创作端网页映射到宿主机的端口 |
| `BOX_LOCAL_PLAYER_LIMIT` | `8` | 本机预览允许的最大连接数 |
| `PERMISSION_TOKEN_SECRET` | 空 | 会话签名密钥；长期部署建议设置固定随机值 |
| `BOX_CREATOR_ALLOWED_HOSTS` | 空 | 额外允许访问创作 API 的本地域名，逗号分隔 |
| `BOX_SESSION_TTL_MS` | `60000` | 编辑/预览 Session 的有效时间 |
| `BOX_SESSION_RATE_LIMIT_PER_MINUTE` | `60` | 单 IP 每分钟创建 Session 上限 |
| `BOX_DATA_STORAGE_DRIVER` | `legacy` | 设为 `postgres` 后使用服主 PostgreSQL 测试数据空间 |
| `BOX_DATABASE_URL` | 空 | PostgreSQL 连接串，只进入游戏服务端 |
| `BOX_DATA_STORAGE_NAMESPACE` | 空 | 迁移旧 edit 数据时填写原作品 ID |
| `BOX_DOCKER_NODE_IMAGE` | Node 22 Debian 镜像 | 可选的 Docker 基础镜像 |

完整配置参阅 [PostgreSQL 数据空间部署手册](postgresql-data-storage.md)。创作端 `edit`
数据与正式游玩端 `play` 数据默认隔离。

生成稳定随机密钥：

```bash
openssl rand -hex 32
```

把输出写入 `.env`：

```env
PERMISSION_TOKEN_SECRET=生成的随机值
```

不要把带有真实密钥的 `.env` 提交到 Git，也不要把密钥写进 Dockerfile。

## 6. 日常创作流程

1. 打开 `http://127.0.0.1:3002/`；
2. 在作品管理器中新建或导入工程；
3. 点击“编辑”，进入 `/e/<作品ID>`；
4. 在编辑器中保存；
5. 返回作品管理器维护名称、作者、简介、封面和版本信息；
6. 发布不可变版本；
7. 按需要导出 `.boxproject` 可编辑工程或游玩部署包。

工程目录结构：

```text
apps/local-engine/projects/<作品ID>/
  project.json
  source/                 当前可编辑工程
  releases/
    <版本号>/             已发布的不可变游玩快照
      manifest.json
      data/
```

不要手动修改 `source/` 内的状态文件和 blob。跨设备继续编辑时，应使用作品管理器的
“导出地图工程”和“导入工程”。

## 7. 工程备份与迁移

### 推荐方式：导出可编辑工程

在作品管理器中选择“导出地图工程”，保存 `.boxproject` 文件。新设备启动创作端后，点击
“导入工程”并选择该文件。

这种方式只迁移选择的作品，适合创作者日常换设备。

### 整体备份

停止容器：

```bash
pnpm stop
```

备份：

```text
apps/local-engine/projects/
apps/local-engine/dist/
.env
```

其中 `.env` 可能包含密钥，应单独安全保存，不要放进公开压缩包。

恢复时把目录放回同一路径，再执行：

```bash
pnpm creator:up
```

如果目标机器没有对应镜像，则执行 `pnpm creator`。

## 8. 将创作端镜像交给另一台机器

创作端通常由创作者自己构建。如果需要离线迁移镜像，可以导出：

```bash
docker image save \
  --output box-local-engine-creator-0.1.0.tar \
  box-local-engine-creator:0.1.0
```

目标机器导入：

```bash
docker image load --input box-local-engine-creator-0.1.0.tar
```

目标机器还需要准备 Compose 文件和两个持久化目录。最小示例：

```yaml
services:
  creator:
    image: box-local-engine-creator:0.1.0
    restart: unless-stopped
    environment:
      BOX_DEPLOYMENT_MODE: creator
      BOX_LOCAL_PLAYER_LIMIT: 8
      PERMISSION_TOKEN_SECRET: ${PERMISSION_TOKEN_SECRET:-}
    ports:
      - "127.0.0.1:3002:3000"
      - "127.0.0.1:9966:9966"
      - "127.0.0.1:9967:9967"
    volumes:
      - ./projects:/app/apps/local-engine/projects
      - ./dist:/app/apps/local-engine/dist
```

启动：

```bash
mkdir -p projects dist
docker compose up -d
```

Linux 如果出现目录无写入权限，可检查挂载目录的属主和权限。容器中的运行用户 UID 通常为
`1000`，可按服务器安全策略调整目录权限。不要为了省事给目录设置全局 `777`。

创作镜像通常面向当前构建机器的 CPU 架构。跨 x86_64 与 ARM 机器分发前，应在目标架构上
重新构建或明确使用 Docker 的跨平台构建能力并完成实际验证。

## 9. 更新创作端

更新代码后执行：

```bash
pnpm check
pnpm creator
```

`pnpm creator` 会替换容器，但不会删除 `projects/` 和 `dist/`。重大升级前仍建议先导出重要
工程并备份宿主机目录。

修改 `BOX_IMAGE_TAG` 后会产生新标签。例如：

```env
BOX_IMAGE_TAG=0.1.1
```

然后重新执行 `pnpm creator`。确认新版本正常后，再按需要手动清理旧镜像。

## 10. 停止、状态与日志

停止当前部署：

```bash
pnpm stop
```

查看状态：

```bash
docker compose --profile creator ps
```

查看最近日志：

```bash
docker compose --profile creator logs --tail=300 creator
```

持续查看日志：

```bash
docker compose --profile creator logs -f creator
```

如果当前目录不在仓库根目录，显式指定 Compose 文件：

```bash
docker compose \
  -f /absolute/path/to/local-engine/docker-compose.yml \
  --profile creator logs --tail=300 creator
```

## 11. 常见问题

### 页面打不开

检查：

```bash
docker compose --profile creator ps
docker compose --profile creator logs --tail=300 creator
```

确认 `BOX_CREATOR_PORT` 未被其他程序占用，并使用 `http://127.0.0.1:<BOX_CREATOR_PORT>/` 访问。

### 页面打开但进入作品后断开

重新点击一次“编辑”，同时查看日志：

```bash
docker compose --profile creator logs -f creator
```

重点检查 `9967`、`createSession`、`Game Server`、`WebSocket` 和“作品运行时异常退出”等信息。
代码修复后必须执行 `pnpm creator` 重建镜像；`creator:up` 不会包含新代码。

### 修改代码后界面没有变化

当前仍在运行旧镜像。执行：

```bash
pnpm creator
```

### 第一次构建很慢

第一次需要下载基础镜像、pnpm 依赖并完成 Next.js 和游戏运行时构建。后续构建会利用 Docker
层缓存和 pnpm store 缓存。不要在构建过程中频繁删除 Docker Build Cache，否则每次都会
重新下载。

### 工程没有保留

检查 Compose 是否仍挂载：

```text
./apps/local-engine/projects:/app/apps/local-engine/projects
```

如果自己编写 Compose 而没有挂载该目录，删除容器后工程可能丢失。

## 12. 安全要求

- 创作端包含编辑器和可编辑工程，不提供公网账号体系；
- 不要把创作端端口直接暴露给玩家或不可信网络；
- 不要把 Docker Socket 挂载进创作容器；
- 不要把 `.env`、证书、私钥或工程备份打进镜像；
- `.boxproject` 只能交给作者或可信协作者；
- 给普通玩家只提供游玩端网址；
- 给私服主优先提供游玩镜像和只读发布地图，不提供创作镜像。

作品创建、编辑和发布操作参阅 [作品创建、编辑与发布](projects.md)。游玩端部署参阅
[游玩端构建与部署手册](play-deployment.md)。

# 部署与联机指南

> PostgreSQL、Redis 的可选本地容器和实际接入范围见
> [本地基础设施与可迁移能力](local-infrastructure.md)。默认部署不依赖它们。

需要交付给其他人时，优先使用以下两份独立手册：

- [创作端构建与部署手册](creator-deployment.md)：创作者设备、工程持久化、构建、升级和排错；
- [游玩端构建、分发与多地图部署手册](play-deployment.md)：私服部署、镜像分发、热添加地图和公网接入。
- [VOXA 本地模型编辑器手册](voxa-deployment.md)：独立模型编辑器镜像、模型持久化、备份和迁移。
- [PostgreSQL 数据空间部署手册](postgresql-data-storage.md)：由服主配置玩家存档、排行榜等持久化数据。

本文保留创作端与游玩端的整体关系和联机配置摘要。

Box Local Engine 对外只有两个完整产品：创作端和游玩端。部署者不需要分别管理网页或运行时
子模块；启动器会自动运行当前产品需要的内部模块。

| 产品   | 用途                       | 是否含编辑能力 | 是否适合公开 |
| ------ | -------------------------- | -------------- | ------------ |
| 创作端 | 创建、编辑、预览和发布作品 | 是             | 否           |
| 游玩端 | 托管已发布作品供玩家游玩   | 否             | 是           |

## 本地开发

安装依赖：

```bash
corepack enable
pnpm install
pnpm check
```

创作端开发模式：

```bash
pnpm dev
```

默认地址分别为：

```text
游玩端：http://127.0.0.1:3000/
VOXA：http://127.0.0.1:3001/
创作端：http://127.0.0.1:3002/
```

三个产品端口互不冲突，可以同时启动。创作端进入作品管理；游玩端进入可游玩作品列表。

## 部署创作端

```bash
cp .env.docker.example .env
pnpm creator
```

该命令只构建创作端镜像，不会同时构建游玩端。

创作端仍只允许本机访问。`3002` 是默认网页端口；编辑和预览运行时使用回环地址上的 `9967`
和 `9966` 建立 WebSocket，不会监听外部网卡。

创作端默认只绑定本机。工程保存在宿主机 `apps/local-engine/projects/`，导出文件保存在
`apps/local-engine/dist/`。升级前仍建议通过作品管理器导出可编辑工程。

创作端没有公网账号与访问控制，不要把它直接暴露给玩家。
创作管理 API 还会校验同源请求和允许的 Host。使用额外本地域名时，可以在 `.env` 中填写：

```env
BOX_CREATOR_ALLOWED_HOSTS=creator.local
```

这不是公网登录系统；创作端仍应绑定 `127.0.0.1`。

## 部署游玩端

启动游玩端：

```bash
pnpm play
```

该命令只准备并启动游玩端。游玩镜像不存在或格式过旧时会自动构建；已经是当前版本时直接
启动，不会重新构建。

游玩端从 `apps/local-engine/play-worlds/` 读取地图。把每个发布版本目录放为一个子目录：

```text
apps/local-engine/play-worlds/island/
  manifest.json
  data/
```

目录名必须与 `manifest.json` 中的作品 ID 一致。玩家地址为 `/p/island`。运行期间可以继续
加入其他地图，不需要重新构建镜像或重启游玩端。默认镜像为 `linux/amd64`；ARM 私服应先
在 `.env` 中设置 `BOX_PLAY_PLATFORM=linux/arm64`，再重新构建和导出。

地图必须是创作端生成的只读发布版本，不能直接放可编辑工程的 `source/`：

```text
apps/local-engine/projects/island/releases/v1.0.0/
  manifest.json
  data/
```

将这个目录整体复制为 `apps/local-engine/play-worlds/island/` 即可。添加完成后约 3 秒内会
出现在首页；玩家第一次进入 `/p/island` 时，系统才会启动该地图的独立运行时。

为了避免复制一半时被扫描到，建议先复制到一个不符合地图 ID 规则的临时目录，确认
`manifest.json` 和 `data/` 都完整后，再整体改名为最终地图 ID。

## 只分发镜像的多地图部署

镜像构建完成后仍然可以增加地图。镜像只包含游玩引擎，地图保存在宿主机，不需要被重新
打进镜像。私服主加载镜像后，在同一目录创建 `compose.yml`：

```yaml
services:
  play:
    image: box-local-engine-play:0.1.0
    restart: unless-stopped
    environment:
      BOX_DEPLOYMENT_MODE: play
      BOX_PLAY_LIBRARY_PATH: /app/play-worlds
      BOX_LOCAL_PLAYER_LIMIT: 8
      PERMISSION_TOKEN_SECRET: ${PERMISSION_TOKEN_SECRET:-}
    ports:
      - '${BOX_PLAY_HOST_IP:-127.0.0.1}:${BOX_PLAY_PORT:-3000}:3000'
    volumes:
      - ./play-worlds:/app/play-worlds:ro
```

然后执行：

```bash
docker load -i play-image.tar
mkdir -p play-worlds
docker compose up -d
```

以后只需向 `play-worlds/` 放入新的发布地图：

```text
play-worlds/island/manifest.json
play-worlds/island/data/
play-worlds/city/manifest.json
play-worlds/city/data/
```

容器始终只启动一次。新增地图无需执行 `docker compose restart`，也无需重新执行
`docker build`。访问 `/` 查看地图列表，或直接访问 `/p/island`、`/p/city`。

需要让服主通过网页管理地图时，在 `.env` 中设置：

```env
BOX_PLAY_ADMIN_TOKEN=至少16位的随机密钥
BOX_PLAY_LIBRARY_READ_ONLY=false
```

重新执行一次 `pnpm play` 后，作品首页会显示“服主管理”。验证成功后可以用一个
`.boxplay` 导入或导出完整地图组（主地图和全部副地图），以及删除已安装地图。没有配置密钥时管理接口返回 `404`；保持
`BOX_PLAY_LIBRARY_READ_ONLY=true` 时地图目录仍为只读。

注意：作品管理器导出的“单作品游玩部署包”仍然固定绑定一个 `world/`，适合一服一图。
需要一服多图时，应使用上面的 `play-worlds/` 挂载方式。

先在作品管理器中保存并发布版本，然后选择“导出游玩部署包”。部署包会包含
`play-image.tar`，服主进入导出目录后执行：

```bash
docker load -i play-image.tar
docker compose up -d
```

游玩端只公开一个端口：

```env
BOX_PLAY_HOST_IP=0.0.0.0
BOX_PLAY_PORT=3000
BOX_LOCAL_PLAYER_LIMIT=8
PERMISSION_TOKEN_SECRET=
```

玩家打开：

```text
http://服务器地址:3000/
```

页面、地图资源、会话请求和 WebSocket 都使用这个地址。内部运行时只监听容器回环地址，
不需要映射或开放任何额外端口。

正式部署建议生成稳定随机密钥：

```bash
openssl rand -hex 32
```

把结果写入 `PERMISSION_TOKEN_SECRET`，重启容器后生效。

## 公网 HTTPS/WSS

公网只需把域名反向代理到游玩端的 `3000` 端口，并转发 WebSocket Upgrade。示例：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl http2;
    server_name game.example.com;

    # ssl_certificate 与 ssl_certificate_key 按实际证书配置

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

玩家访问 `https://game.example.com/` 时，浏览器会自动使用同源 `wss://` 连接。

## 常用命令

```bash
pnpm creator:up
docker compose ps
docker compose logs -f creator
docker compose logs -f play
pnpm stop
```

`pnpm creator:up` 只使用本机已有的创作端镜像，不执行构建；如果镜像尚不存在，应先执行
一次 `pnpm creator`。

只构建或直接启动源码产物的 `build:creator`、`start:creator`、`build:play` 和
`start:play` 属于维护者命令，不是正常部署流程。

`pnpm stop` 只停止容器，不会删除宿主机工程。不要手动删除
`apps/local-engine/projects/`，除非已经导出备份。

## 排查问题

页面无法打开时，确认 `BOX_PLAY_PORT` 没有被占用，并查看容器日志。

页面能打开但无法进入游戏时，检查：

- `http://服务器地址:3000/api/health-check` 是否返回 `status: ok`；
- `http://服务器地址:3000/api/play-worlds` 是否能列出已安装地图；
- 反向代理是否使用 HTTP/1.1 并转发 Upgrade/Connection；
- HTTPS 页面是否由同一个域名提供；
- 防火墙是否允许 `BOX_PLAY_PORT`。

不需要检查或公开其他端口；内部通信由游玩端自行管理。

## 安全边界

- 创作端包含编辑器和本地工程，只用于创作者设备或可信内网。
- 游玩端只加载发布快照，不包含工程 `source/`、作品管理接口或编辑页面。
- 环境变量、Token、证书和私钥应在运行时注入，不能写入镜像。
- 玩家浏览器必然能取得当前场景使用的模型、贴图和音频；重要规则与秘密应留在权威运行时。
- 普通玩家只需要网址，不需要获得 Docker 镜像或作品部署包。

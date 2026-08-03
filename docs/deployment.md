# 部署与联机指南

本文档说明 Box Local Engine 的本地一体运行、客户端与服务端拆分、Docker 部署、局域网
连接和公网反向代理。

## 运行模式

| 模式 | 适用场景 | 对外端口 | 是否包含创作端 |
| --- | --- | --- | --- |
| 本地一体模式 | 开发、创作、单机测试 | `3000` | 是 |
| 玩家客户端 | 玩家连接远程服务器 | `3000` | 否 |
| 专用服务器 | 托管世界、多人游玩 | `9966` | 否 |

本地一体模式内部还会启动 `9966` 游玩服务器和 `9967` 创作服务器。专用服务器模式不会
启动 `9967`。

## 源码安装

```bash
corepack enable
pnpm install
pnpm check
```

生产构建只需在首次安装或源码变化后执行。

### 本地一体模式

```bash
pnpm build
pnpm start
```

访问：

- <http://127.0.0.1:3000/p/local>
- <http://127.0.0.1:3000/e/local>

### 专用服务器

```bash
pnpm build:server

BOX_SERVER_PUBLIC_URL=http://192.168.1.20:9966 \
BOX_SERVER_NAME="我的 BOX 世界" \
pnpm start:server
```

检查：

```bash
curl http://192.168.1.20:9966/api/server-info
```

服务端需要开放 TCP `9966`。HTTP 接口与 WebSocket 共用该端口。

### 玩家客户端

```bash
pnpm build:client
pnpm start:client
```

打开 <http://127.0.0.1:3000/connect> 并输入：

```text
http://192.168.1.20:9966
```

也可以预设服务器：

```bash
BOX_REMOTE_SERVER_URL=http://192.168.1.20:9966 pnpm start:client
```

`pnpm build:client` 会生成 player-only 的 Next standalone 产物。编辑页、管理员实现和
Monaco 不会进入玩家运行包；`pnpm start:client` 还会校验构建标记，防止误发布完整创作
构建。

客户端选择服务器的优先级：

1. 游玩地址中的 `?server=...`
2. `BOX_REMOTE_SERVER_URL`
3. 浏览器上次成功连接的地址
4. 本地一体模式默认地址

访问 `?server=local` 可以清除浏览器保存的远程服务器并返回本地连接。

## Docker Compose

复制配置模板：

```bash
cp .env.docker.example .env
```

局域网示例：

```env
BOX_SERVER_PUBLIC_URL=http://192.168.1.20:9966
BOX_REMOTE_SERVER_URL=http://192.168.1.20:9966
BOX_SERVER_NAME=我的 BOX 世界
BOX_SERVER_PUBLISHED_PORT=9966
BOX_CLIENT_PUBLISHED_PORT=3000
```

构建：

```bash
docker compose build server client
```

客户端镜像的运行阶段只复制 `.next/standalone`，不会复制仓库源码、创作端源码、
workspace 源码或服务端源码。

按需启动：

```bash
# 仅服务端
docker compose up -d server

# 仅客户端
docker compose up -d client

# 客户端和服务端
docker compose up -d
```

查看状态与日志：

```bash
docker compose ps
docker compose logs -f server
docker compose logs -f client
```

停止：

```bash
docker compose down
```

### Docker 数据持久化

服务端数据卷：

```text
box-local-engine_box-server-data
```

普通的 `docker compose down`、重新构建镜像或重建容器不会删除它。以下命令会删除数据
卷，请谨慎使用：

```bash
docker compose down -v
```

### Docker 基础镜像

默认使用：

```text
node:22.17.0-bookworm-slim
```

Docker Hub 较慢时，可以在 `.env` 中配置兼容的镜像源：

```env
BOX_DOCKER_NODE_IMAGE=你的镜像仓库/node:22.17.0-bookworm-slim
```

替代镜像需要包含 Node.js 22、Corepack 和 Debian `apt-get`。

## 公网 HTTPS/WSS

如果客户端网页通过 HTTPS 打开，浏览器会阻止它连接普通 HTTP/WS 服务端。公网部署必须
同时提供 HTTPS 和 WSS。

服务端配置：

```bash
BOX_SERVER_PUBLIC_URL=https://game.example.com pnpm start:server
```

或在 Docker `.env` 中配置：

```env
BOX_SERVER_PUBLIC_URL=https://game.example.com
BOX_REMOTE_SERVER_URL=https://game.example.com
```

Nginx 示例：

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
        proxy_pass http://127.0.0.1:9966;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

反向代理必须转发：

- `GET /api/server-info`
- `POST /api/session`
- `OPTIONS /api/session`
- `GET /block/:hash`
- WebSocket Upgrade

## 配置参考

### 服务端

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BOX_SERVER_HOST` | `0.0.0.0` | 容器或主机监听地址 |
| `BOX_SERVER_PORT` | `9966` | HTTP/WebSocket 端口 |
| `BOX_SERVER_PUBLIC_URL` | 自动推断 | 玩家实际访问的公开地址 |
| `BOX_SERVER_DATA_PATH` | `apps/local-engine/data` | 世界和资源目录 |
| `BOX_SERVER_CONTENT_ID` | `0` | 世界 ID |
| `BOX_SERVER_NAME` | `BOX Dedicated Server` | 服务器显示名称 |
| `BOX_LOCAL_PLAYER_LIMIT` | `8` | 最大玩家数 |

### 客户端

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BOX_CLIENT_HOST` | `127.0.0.1` | 网页监听地址；Docker 中为 `0.0.0.0` |
| `BOX_CLIENT_PORT` | `3000` | 网页端口 |
| `BOX_REMOTE_SERVER_URL` | 空 | 默认专用服务器地址 |

### Docker Compose

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BOX_SERVER_PUBLISHED_PORT` | `9966` | 服务端宿主机端口 |
| `BOX_CLIENT_PUBLISHED_PORT` | `3000` | 客户端宿主机端口 |
| `BOX_DOCKER_NODE_IMAGE` | 官方 Node 22 镜像 | 构建基础镜像 |

## 排查连接问题

### 连接页提示无法连接

检查服务端信息接口：

```bash
curl http://服务器IP:9966/api/server-info
```

如果失败，请检查服务是否启动、IP 是否正确以及防火墙是否放行 `9966`。

### 页面能打开但进入游戏失败

检查：

- `BOX_SERVER_PUBLIC_URL` 是否是玩家能够访问的地址。
- HTTPS 客户端是否错误连接了 HTTP 服务端。
- 反向代理是否支持 WebSocket Upgrade。
- `/api/session` 和 `/block/:hash` 是否被代理或防火墙拦截。

### Docker 客户端无法连接 Docker 服务端

不要把 `BOX_REMOTE_SERVER_URL` 设置为 `http://server:9966`。这个名称只在 Docker 网络
内部可见，而真正发起连接的是玩家浏览器。请填写局域网 IP 或公网域名。

### 端口被占用

停止正在运行的源码服务：

```bash
# 在 pnpm dev/start 的终端按 Ctrl+C
```

或者修改 `.env` 中的 Docker 发布端口。

## 当前限制

- 仅支持一个内置世界。
- 专用服务器使用游客身份，没有完整账号与访问控制。
- 尚未完成从创作端发布世界包的流程。
- 尚未完成跨地图传送、Mod 分发和桌面安装包。
- 公开部署前必须自行配置 TLS、防火墙和访问策略。

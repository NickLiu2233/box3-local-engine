# BOX 专用游戏服务器

`services/game-server` 是 Box Local Engine 的权威游戏服务器。专用服务器模式只允许玩家
游玩，不启动创作服务，也不提供在线协作编辑。

## 构建与运行

在仓库根目录执行：

```bash
pnpm build:server
pnpm start:server
```

默认监听 `0.0.0.0:9966`，可通过以下接口检查状态：

```text
GET http://127.0.0.1:9966/api/server-info
GET http://127.0.0.1:9966/api/health-check
```

## 玩家连接链路

```text
POST /api/session
      ↓
返回 sessionId 和 socketServerUrl
      ↓
WebSocket 连接 /?sid=<sessionId>
      ↓
GET /block/:hash 下载世界和人物资源
```

游玩模式的资源存储为只读：

- `GET /block/:hash`：允许
- `POST /block`：返回 `403 Forbidden`

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BOX_SERVER_HOST` | `0.0.0.0` | 监听地址 |
| `BOX_SERVER_PORT` | `9966` | HTTP 和 WebSocket 端口 |
| `BOX_SERVER_PUBLIC_URL` | 根据请求推断 | 返回给玩家的公开地址 |
| `BOX_SERVER_DATA_PATH` | `apps/local-engine/data` | 世界和资源目录 |
| `BOX_SERVER_CONTENT_ID` | `0` | 当前世界 ID |
| `BOX_SERVER_NAME` | `BOX Dedicated Server` | 服务器名称 |
| `BOX_LOCAL_PLAYER_LIMIT` | `8` | 最大玩家数 |

公网部署时必须设置可公开访问的 HTTPS 地址，并由反向代理转发 WebSocket：

```bash
BOX_SERVER_PUBLIC_URL=https://game.example.com pnpm start:server
```

## Docker

```bash
docker compose build server
docker compose up -d server
docker compose logs -f server
```

世界数据保存在 Docker 命名卷 `box-local-engine_box-server-data`。不要使用
`docker compose down -v`，除非确定要删除服务端世界数据。

完整说明请参阅：

- [项目 README](../../README.md)
- [部署与联机指南](../../docs/deployment.md)

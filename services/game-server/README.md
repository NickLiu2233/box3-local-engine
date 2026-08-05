# BOX 游戏运行时

`services/game-server` 是 Box Local Engine 内部的权威游戏运行时。它由创作端或游玩端
启动器管理，不再作为普通用户需要单独部署的产品。

## 本地调试

在本目录可以直接启动一个使用 Local Engine 本地配置的游玩运行时：

```bash
pnpm run dev
```

默认监听 `127.0.0.1:9966`，调试器监听 `127.0.0.1:9223`。切换为编辑运行时：

```bash
MODE=edit pnpm run dev
```

该命令会自动加载 `apps/local-engine/config/local.config.json`，无需手动填写环境、版本或
区域变量。日常打开完整创作端仍应在仓库根目录执行 `pnpm dev`。

## 在两种模式中的职责

创作端会启动：

- 游玩运行时，用于本地预览。
- 编辑运行时，用于保存工程变化。

游玩端只启动只读游玩运行时，不启动编辑能力，也不提供在线协作编辑。

普通用户只运行：

```bash
pnpm creator
pnpm play
```

具体作品通过作品管理器导出的部署包启动。底层运行时由产品启动器自动管理。

## 玩家连接链路

```text
POST /api/createSession
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

健康检查：

```text
GET /api/health-check
```

`/api/session` 与 `/api/server-info` 属于旧的游戏服务直连兼容入口，本地产品默认不开放。
只有服主明确设置 `BOX_DIRECT_SESSION_API=true` 并直接暴露游戏服务端口时才会注册。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BOX_SERVER_HOST` | `127.0.0.1` | HTTP 和 WebSocket 内部监听地址 |
| `BOX_SERVER_PORT` | `9966` | HTTP 和 WebSocket 端口 |
| `BOX_SERVER_DATA_PATH` | Local Engine 数据目录 | 世界和资源目录 |
| `BOX_SERVER_CONTENT_ID` | `0` | 世界 ID |
| `BOX_SERVER_NAME` | `BOX 世界` | 玩家看到的名称 |
| `BOX_LOCAL_PLAYER_LIMIT` | `8` | 最大玩家数 |

普通部署不直接公开这些端口。游玩端网页通过同源网关转发 HTTP、资源和 WebSocket。

## 发布数据约束

游玩端只能加载作品发布后的不可变快照。发行镜像和挂载目录中不应出现：

- 工程 `source/`
- 项目管理器的写入接口
- 未发布素材或本机 blob
- 可编辑 `.boxproject` 工程包
- 环境变量文件、证书、私钥和 Source Map

玩家浏览器仍需下载场景实际使用的模型、贴图和音频，因此重要逻辑、权限和不可公开数据
应留在权威运行时中。

完整说明：

- [项目 README](../../README.md)
- [部署与联机指南](../../docs/deployment.md)

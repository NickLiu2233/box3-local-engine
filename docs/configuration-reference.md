# 配置参考

桌面启动器负责保存 `.env` 并生成内部 `.runtime.env`；源码/Docker Compose 直接使用 `.env`。修改配置后重启受影响服务。

## 最小配置

```env
PERMISSION_TOKEN_SECRET=<至少 32 位随机值>
BOX_PLAYER_AUTH_API_KEY=<至少 16 位随机值>
BOX_PLAY_ADMIN_TOKEN=<至少 32 位随机值>
BOX_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

## 常用变量

| 类别     | 变量                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| 网络     | `BOX_BIND_IP`、`BOX_PLAY_PORT`、`BOX_CREATOR_PORT`、`BOX_VOXA_PORT`、`BOX_PLAYER_SERVICE_PORT`、`BOX_AUTH_PORTAL_PORT`   |
| Play     | `BOX_PLAY_LIBRARY_DIR`、`BOX_PLAY_LIBRARY_READ_ONLY`、`BOX_PLAY_MAX_RUNTIMES`、`BOX_RUNTIME_IDLE_TIMEOUT_MS`             |
| Teleport | `BOX_TELEPORT_MAX_ROOMS`、`BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS`                                                            |
| 数据     | `BOX_DATABASE_URL`、`BOX_DATABASE_SSL`、`REDIS_HOST`、`REDIS_PORT`                                                       |
| 登录     | `BOX_PLAYER_LOGIN_URL`、`BOX_PLAYER_AUTH_ALLOWED_ORIGINS`、`BOX_PLAYER_REGISTRATION_ENABLED`、`BOX_PLAYER_COOKIE_DOMAIN` |

`BOX_PLAY_LIBRARY_DIR` 是固定的地图数据目录，和 `BOX_PLAY_PORT` 无关。Creator 与 VOXA 只允许本机或可信局域网；公网部署应让 Play 与登录门户走 HTTPS 反向代理。

## 网络与公开地址

默认端口为 Play `3000`、VOXA `3001`、Creator `3002`、Player Service `3213`、登录门户 `3214`。同一台主机上的端口不能重复。`BOX_BIND_IP=127.0.0.1` 仅本机访问；局域网或公网部署需要同时更新公开 URL、登录门户 URL 和反向代理配置。

Creator 与 VOXA 不应设置为公网地址。Play 公网地址应写入 `BOX_PLAY_PUBLIC_URL` 或对应启动器配置，使用 HTTPS 域名；Cookie 跨子域共享时才设置 `BOX_PLAYER_COOKIE_DOMAIN`。

## 容量与运行时

`BOX_PLAY_MAX_RUNTIMES` 限制同时运行的地图和 Teleport 房间总数；`BOX_PLAY_PREWARM_RUNTIMES` 控制预热数量；`BOX_RUNTIME_IDLE_TIMEOUT_MS` 控制无连接地图的回收时间。低配机器优先降低运行时数量和容器内存上限，再观察启动器性能监控。

`BOX_PLAY_LIBRARY_READ_ONLY=true` 会关闭网页端导入、删除和服主管理入口；需要服主从网页导入 `.boxplay` 时设为 `false`。地图文件不会因端口或容器重启而丢失，但自定义目录必须在升级后继续挂载。

## 修改后的动作

| 修改内容                       | 需要重启                       |
| ------------------------------ | ------------------------------ |
| 端口、公开 URL、Cookie、Origin | Play、Player Service、登录门户 |
| PostgreSQL、Redis、密钥        | 所有依赖该配置的服务           |
| Play 容量、Teleport、地图库    | Play                           |
| 注册开关                       | Player Service 与登录门户      |

启动器保存配置后会重新派生内部 URL；不要手工编辑 `.runtime.env`。源码部署可以编辑 `.env`，但改动后同样需要重新创建容器。

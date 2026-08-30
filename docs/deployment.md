# 部署与联机

本文只说明服务如何放在本机、局域网或公网。安装、地图导入和全部环境变量分别见[安装、部署与运维](./installation-and-operations.md)、[游玩端部署](./play-deployment.md)和[配置参考](./configuration-reference.md)。

## 服务暴露边界

| 服务                            | 默认地址         | 本机 | 可信局域网 | 公网               |
| ------------------------------- | ---------------- | ---- | ---------- | ------------------ |
| Creator                         | `127.0.0.1:3002` | 是   | 可选       | 不应公开           |
| VOXA                            | `127.0.0.1:3001` | 是   | 可选       | 不应公开           |
| Play                            | `127.0.0.1:3000` | 是   | 是         | 经 HTTPS 反向代理  |
| Player Service                  | `127.0.0.1:3213` | 是   | 受控       | 只公开必要认证 API |
| 参考登录门户                    | `127.0.0.1:3214` | 是   | 是         | 可公开或替换       |
| PostgreSQL / Redis / Docker API | 内部地址         | 受控 | 不建议     | 禁止公开           |

Creator 和 VOXA 含写入、导入与编辑能力，只适合本机或可信局域网。Play 是面向玩家的唯一地图入口；网页、地图资源、会话请求和 WebSocket 都从同一公开地址进入。

## 本机部署

默认配置绑定回环地址。桌面启动器选择“全部”“创作端”或“游玩端”后会自动启动对应容器并更新状态。

源码运行示例：

```bash
pnpm creator
pnpm play
pnpm voxa
pnpm player-service
pnpm player-auth-portal
```

这些命令按服务构建；已有镜像时使用对应 `:up`。停止服务执行 `pnpm stop`，不会删除工程、地图或数据库。

本机也必须保持公开 URL 与浏览器地址一致。例如浏览器访问 `127.0.0.1` 时，不要把登录回跳配置成 `localhost` 或局域网 IP，否则 Cookie 和同源判断可能导致登录循环。

## 局域网部署

需要其他设备访问时，将 Play、Player Service 和登录门户绑定到 `0.0.0.0`，并把公开 URL 写成主机的固定局域网 IP：

```env
BOX_PLAY_PUBLIC_URL=http://192.168.1.20:3000
BOX_PLAYER_SERVICE_PUBLIC_URL=http://192.168.1.20:3213
BOX_AUTH_PORTAL_PUBLIC_URL=http://192.168.1.20:3214
BOX_PLAYER_LOGIN_URL=http://192.168.1.20:3214
```

具体绑定变量由部署模板决定：桌面启动器统一生成，源码 Compose 使用 `BOX_PLAY_HOST_IP` 等服务级变量，无图形服务器包使用 `BOX_BIND_IP`。以所用 `.env.example` 为准，不要同时混用不同模板。

局域网注意事项：

- 给主机分配固定 DHCP 地址或静态 IP。
- 只开放实际使用的端口。
- Creator/VOXA 若允许局域网访问，应只对可信网段开放。
- 修改 IP 后同步修改所有公开 URL、登录回跳和允许 Origin。
- 从另一台设备分别测试登录、返回 Play、打开地图和 WebSocket，而不只测试首页。

## 公网部署

公网推荐拓扑：

```text
玩家浏览器
  → HTTPS 反向代理 / 防火墙
    → Play
    → 登录门户
    → Player Service 必要认证接口

管理页面、Creator、VOXA、PostgreSQL、Redis、Docker API
  → 仅本机、VPN 或管理网络
```

建议使用同一主域名的子域：

```env
BOX_PLAY_PUBLIC_URL=https://play.example.com
BOX_PLAYER_SERVICE_PUBLIC_URL=https://player.example.com
BOX_PLAYER_LOGIN_URL=https://login.example.com
BOX_PLAYER_COOKIE_DOMAIN=.example.com
```

浏览器不能在完全不同的站点之间可靠共享登录 Cookie。生产环境必须使用 HTTPS；Cookie Domain 只能设为这些服务共同拥有的父域。

### 反向代理要求

- 转发 `Host`、客户端协议和 WebSocket Upgrade。
- 设置合理的上传上限，以便导入 `.boxplay`。
- 为长连接和大地图首次启动设置足够的超时。
- 只在代理会覆盖并清洗客户端转发头时启用 `BOX_TRUST_PROXY=true`。
- 对 Player Service 的 `/players` 和管理 API 增加 VPN、IP 白名单或额外访问控制。

Play 的 Nginx 示例：

```nginx
server {
    listen 443 ssl http2;
    server_name play.example.com;

    client_max_body_size 2g;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
```

证书路径、TLS 策略和安全响应头应按实际域名及运维平台配置，不要直接复制占位值。

## 登录链路

未登录玩家访问 Creator 或 Play 时，会跳转到 `BOX_PLAYER_LOGIN_URL`，并携带来源和同源校验后的 `returnUrl`。登录门户通过自己的服务端代理调用 Player Service，浏览器不能获得 `BOX_PLAYER_AUTH_API_KEY`。

```text
浏览器访问 Play
  → Play 检查玩家 Session
  → 跳转登录门户
  → 门户后端携带 API Key 调用 Player Service
  → Player Service 写入 HttpOnly Cookie
  → 返回原 Play URL
```

出现“已经登录仍回到登录页”时，依次核对：

1. 浏览器实际使用的协议、主机和端口；
2. `BOX_PLAY_PUBLIC_URL`、`BOX_PLAYER_SERVICE_PUBLIC_URL`、`BOX_PLAYER_LOGIN_URL`；
3. `BOX_PLAYER_COOKIE_DOMAIN` 和 HTTPS；
4. Portal 是否转发请求 Cookie 与全部 `Set-Cookie`；
5. 服务是否在修改 `.env` 后重新创建。

不要通过关闭 Cookie 校验或回退游客会话解决登录循环。

## 地图交付

Creator 发布一个 `.boxplay`，服主在 Play 管理界面导入。`.boxplay` 是地图组数据，不含镜像；桌面离线包和无图形服务器包提供运行镜像，不含用户地图。

Creator 不生成 Docker 镜像。维护者可单独分发镜像归档，但镜像更新和地图更新应彼此独立。

## 上线检查

- Play 首页、健康检查和 WebSocket 可从外网访问。
- 未登录访问会跳到正确门户，登录后只返回原服务同源 URL。
- 关闭注册后，注册 API 被拒绝且参考门户不显示注册入口。
- `BOX_PLAY_LIBRARY_READ_ONLY=true` 时不显示服主管理入口，写接口也被服务端拒绝。
- 关闭地图后大厅不显示，直接 URL 也无法进入。
- Player Service 管理页、数据库、Redis 和 Docker API 无法从公网直接访问。
- `.env`、密钥、数据库备份、地图工程和日志不在网页静态文件或 Release 中。
- PostgreSQL、地图目录和关键卷已有可恢复的异机备份。

## 快速诊断

```bash
docker compose ps
docker compose logs --tail=200 play
docker compose logs --tail=200 player-service
curl http://127.0.0.1:3000/api/health-check
curl http://127.0.0.1:3000/api/play-worlds
```

如果容器内部健康而外部不可访问，检查宿主机监听地址、防火墙、反向代理和公开 URL。如果容器不断重启，先看第一个错误和依赖服务状态，不要先删除卷或清空数据库。

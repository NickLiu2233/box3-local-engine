# 独立玩家登录门户

这是一个服主可以直接部署的登录/注册程序。它使用独立的
`box-local-engine-player-auth-portal` 镜像，不会进入 Creator、Play、Player Service 或 VOXA
镜像，也不直接访问 PostgreSQL。

浏览器只请求本程序的 `/api/auth/*`；本程序在服务端向 Player Service 转发登录、注册、
Session 查询和退出请求。`BOX_PLAYER_AUTH_API_KEY` 的对应密钥不会发给浏览器。

## 本地运行

要求 Node.js 20 或更高版本，不需要安装第三方依赖。

```bash
cd examples/player-auth-portal
cp .env.example .env
```

编辑 `.env`：

```env
AUTH_DEMO_PLAYER_SERVICE_URL=http://127.0.0.1:3124
AUTH_DEMO_API_KEY=与Player-Service的BOX_PLAYER_AUTH_API_KEY完全相同
AUTH_DEMO_CREATOR_URL=http://127.0.0.1:3127
AUTH_DEMO_PLAY_URL=http://127.0.0.1:3121
```

Player Service 使用相同密钥，并把未登录用户引导到该程序：

```env
BOX_PLAYER_AUTH_API_KEY=与AUTH_DEMO_API_KEY完全相同
BOX_PLAYER_LOGIN_URL=http://127.0.0.1:3125
```

启动：

```bash
npm start
```

访问 [http://127.0.0.1:3125](http://127.0.0.1:3125)。Creator/Play 跳转过来时会携带
`source` 和 `returnUrl`，登录成功后程序只允许返回已配置 Creator/Play 同源地址，防止开放
重定向。

## API 代理

| 本程序接口                | Player Service 上游接口          |
| ------------------------- | -------------------------------- |
| `POST /api/auth/register` | `POST /api/player-auth/register` |
| `POST /api/auth/login`    | `POST /api/player-auth/login`    |
| `GET /api/auth/session`   | `GET /api/player-auth/session`   |
| `POST /api/auth/logout`   | `POST /api/player-auth/logout`   |

登录与注册 JSON 参数与 [Player Service API](../../docs/player-service-api.md) 一致。代理会原样
转发上游状态码、`Retry-After` 和全部 `Set-Cookie`，但只向上游传递白名单字段，不会把 API
Key 返回到浏览器。

## Docker 一键部署（推荐）

在仓库根目录复制配置并生成密钥：

```bash
cp .env.docker.example .env
openssl rand -hex 32
```

把生成的随机值写入 `.env` 的 `BOX_PLAYER_AUTH_API_KEY`，并设置：

```env
BOX_PLAYER_LOGIN_URL=http://127.0.0.1:3125
BOX_AUTH_PORTAL_PUBLIC_URL=http://127.0.0.1:3125
```

首次部署：

```bash
pnpm player-service
pnpm player-auth-portal
```

访问 [http://127.0.0.1:3125](http://127.0.0.1:3125)。代码或基础镜像没有变化时，可直接
启动已有镜像：

```bash
pnpm player-auth-portal:up
```

门户容器固定通过 Compose 内网地址 `http://player-service:3213` 访问玩家服务。浏览器不会拿到
`BOX_PLAYER_AUTH_API_KEY`。容器默认仅绑定宿主机 `127.0.0.1:3125`、以非 root 用户运行，启用
只读根文件系统、能力删除和健康检查。

只使用 Docker Compose 时也可执行：

```bash
docker compose --profile player-service --profile auth-portal up -d --build \
  player-service player-auth-portal
```

健康检查：

```bash
curl http://127.0.0.1:3125/api/health-check
```

该接口只检查门户自身，不依赖 Player Service，避免上游短暂不可用时反复重启门户。

## 正式部署提醒

- 登录程序、Creator、Play 和 Player Service 推荐部署在同一主域名的 HTTPS 子域。
- 跨子域共享登录时，在 Player Service 配置共同的 `BOX_PLAYER_COOKIE_DOMAIN`。
- 反向代理应保留真实客户端 IP；只有代理可信时才设置 `AUTH_DEMO_TRUST_PROXY=true` 和
  Player Service 的 `BOX_TRUST_PROXY=true`。
- API Key 至少 16 位，推荐 `openssl rand -hex 32`，只放在两个服务端的秘密配置中。
- 这个镜像可以直接用于小型部署和功能测试。需要验证码、邮件验证或接入既有账号体系时，服主
  仍可参考同一套 API 自建页面，但不要把 API Key 放入前端 JavaScript。

## 检查

```bash
npm run check
```

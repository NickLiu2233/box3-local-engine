# 独立玩家登录示例

这是一个模拟服主自行开发的登录/注册程序。它独立于 Creator、Play 和 Player Service，
不会进入 Local Engine 的任何镜像，也不直接访问 PostgreSQL。

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
AUTH_DEMO_PLAYER_SERVICE_URL=http://127.0.0.1:3213
AUTH_DEMO_API_KEY=与Player-Service的BOX_PLAYER_AUTH_API_KEY完全相同
AUTH_DEMO_CREATOR_URL=http://127.0.0.1:3002
AUTH_DEMO_PLAY_URL=http://127.0.0.1:3000
```

Player Service 使用相同密钥，并把未登录用户引导到该程序：

```env
BOX_PLAYER_AUTH_API_KEY=与AUTH_DEMO_API_KEY完全相同
BOX_PLAYER_LOGIN_URL=http://127.0.0.1:3214
```

启动：

```bash
npm start
```

访问 [http://127.0.0.1:3214](http://127.0.0.1:3214)。Creator/Play 跳转过来时会携带
`source` 和 `returnUrl`，登录成功后程序只允许返回已配置 Creator/Play 同源地址，防止开放
重定向。

## API 代理

| 本程序接口 | Player Service 上游接口 |
| --- | --- |
| `POST /api/auth/register` | `POST /api/player-auth/register` |
| `POST /api/auth/login` | `POST /api/player-auth/login` |
| `GET /api/auth/session` | `GET /api/player-auth/session` |
| `POST /api/auth/logout` | `POST /api/player-auth/logout` |

登录与注册 JSON 参数与 [Player Service API](../../docs/player-service-api.md) 一致。代理会原样
转发上游状态码、`Retry-After` 和全部 `Set-Cookie`，但只向上游传递白名单字段，不会把 API
Key 返回到浏览器。

## 正式部署提醒

- 登录程序、Creator、Play 和 Player Service 推荐部署在同一主域名的 HTTPS 子域。
- 跨子域共享登录时，在 Player Service 配置共同的 `BOX_PLAYER_COOKIE_DOMAIN`。
- 反向代理应保留真实客户端 IP；只有代理可信时才设置 `AUTH_DEMO_TRUST_PROXY=true` 和
  Player Service 的 `BOX_TRUST_PROXY=true`。
- API Key 至少 16 位，推荐 `openssl rand -hex 32`，只放在两个服务端的秘密配置中。
- 这个目录是最小可运行参考实现。服主可替换页面、接入验证码、邮件验证或自己的账号体系，
  但不要把 API Key 放入前端 JavaScript。

## 检查

```bash
npm run check
```

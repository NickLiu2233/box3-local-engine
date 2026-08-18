# Player Service 对外 API

Player Service 是无界面的身份服务。Local Engine 不再内置玩家登录/注册页面；服主可以使用
任意前端技术实现登录页，通过下列 API 创建 Session。玩家管理后台仍位于 `/players`。

仓库提供了一个不进入任何镜像的完整服务端代理示例：
[独立玩家登录门户](../examples/player-auth-portal/README.md)。它可以直接运行或作为独立镜像部署，也可以作为服主
自有登录程序的最小参考实现。

## 部署与跳转

```env
BOX_PLAYER_SERVICE_PUBLIC_URL=https://player.example.com
BOX_CREATOR_PUBLIC_URL=https://creator.example.com
BOX_PLAY_PUBLIC_URL=https://play.example.com
BOX_PLAYER_LOGIN_URL=https://www.example.com/login
BOX_PLAYER_AUTH_API_KEY=使用随机生成的至少16位服务端密钥
BOX_PLAYER_AUTH_ALLOWED_ORIGINS=https://www.example.com
BOX_PLAYER_COOKIE_DOMAIN=.example.com
```

配置 `BOX_PLAYER_LOGIN_URL` 后，未登录访问 Creator 或 Play 时系统会跳转到该地址，并追加：

- `source=creator|play`：访问来源；
- `returnUrl=<url>`：登录完成后的返回地址，只会是对应 Creator/Play 公网地址的同源 URL。

登录页读取 `returnUrl`，认证成功后使用 `location.assign(returnUrl)` 返回。不要自行接受其他
回跳地址。认证接口不是浏览器直连接口：登录页必须调用服主自己的登录后端，由登录后端附加
`X-Box-Player-Auth-Key` 请求头。这个 Key 只配置在 Player Service 和服主登录后端的 `.env`
中，不能出现在 HTML、JavaScript、移动端包或公开仓库里。建议通过
`openssl rand -hex 32` 生成，并由秘密管理系统分发。

`BOX_PLAYER_AUTH_ALLOWED_ORIGINS` 是额外的 Origin 限制，不代替 API Key。多个 Origin 使用
英文逗号分隔，不支持 `*`。纯服务端请求通常没有 Origin 请求头。

浏览器不能在完全不同的站点间共享本服务的登录 Cookie。生产环境推荐把登录页、Creator、
Play 和 Player Service 部署到同一主域名的 HTTPS 子域，并设置共同的
`BOX_PLAYER_COOKIE_DOMAIN`。管理令牌绝不能放进玩家登录前端。

## 玩家认证 API

所有响应均为 JSON，且禁用缓存。以下示例中的 `PLAYER_SERVICE` 是 Player Service 内网或
公网地址。四个接口全部要求登录后端携带：

```http
X-Box-Player-Auth-Key: <BOX_PLAYER_AUTH_API_KEY>
```

### 注册

`POST /api/player-auth/register`

```json
{
  "username": "player_001",
  "displayName": "玩家一号",
  "password": "至少八位密码"
}
```

成功返回 HTTP 201 和 `{ "player": Player }`，并写入 Session Cookie。服主可通过
`BOX_PLAYER_REGISTRATION_ENABLED=false` 关闭自助注册；后台新增用户不受此开关影响。

### 登录

`POST /api/player-auth/login`

```json
{ "username": "player_001", "password": "至少八位密码" }
```

成功返回 HTTP 200 和 `{ "player": Player }`，并写入 Session Cookie。失败返回 401；超过
按 IP 配置的失败次数后返回 429 和 `Retry-After`。

### 当前会话

`GET /api/player-auth/session`

返回 `{ "player": Player | null, "databaseEnabled": boolean, "registrationEnabled": boolean }`。

### 退出登录

`POST /api/player-auth/logout`

删除当前 Session 并清除 Cookie，返回 `{ "loggedOut": true }`。

服主登录后端代理示例（伪代码）：

```js
// 该代码必须运行在服主后端，不能打包进浏览器。
const upstream = await fetch(`${process.env.PLAYER_SERVICE}/api/player-auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Box-Player-Auth-Key': process.env.BOX_PLAYER_AUTH_API_KEY,
    'Cookie': request.headers.cookie || '',
  },
  body: JSON.stringify(request.body),
})
// 将上游的状态码、JSON 和全部 Set-Cookie 原样转发给浏览器。
response.status(upstream.status)
for (const cookie of upstream.headers.getSetCookie?.() || []) {
  response.appendHeader('Set-Cookie', cookie)
}
response.json(await upstream.json())
```

浏览器只调用服主自己的代理路由，永远不会获得 API Key。代理登录、注册、Session 查询和
退出时都应转发浏览器的 `Cookie`；登录、注册和退出还必须把 Player Service 返回的全部
`Set-Cookie` 原样传回浏览器。

## 服主管理 API

管理 API 支持玩家后台的登录 Session，也支持服务端管理令牌：

```http
Authorization: Bearer <BOX_PLAY_ADMIN_TOKEN>
Content-Type: application/json
```

管理令牌只允许保存在服主后端、命令行或秘密管理系统中。不要从浏览器前端直接调用带管理
令牌的接口。

| 方法与路径                                  | 权限        | 用途                             |
| ------------------------------------------- | ----------- | -------------------------------- |
| `GET /api/play-admin/players`               | 管理员      | 搜索、筛选和分页查询玩家         |
| `POST /api/play-admin/players`              | 服主        | 创建用户，不创建登录 Session     |
| `GET /api/play-admin/players/:subjectId`    | 管理员      | 资料、会话、登录历史和审计详情   |
| `PATCH /api/play-admin/players/:subjectId`  | 管理员/服主 | 修改资料、封禁、角色、神岛 ID 等 |
| `POST /api/play-admin/players/:subjectId`   | 管理员/服主 | 强制下线、撤销设备、重置密码     |
| `DELETE /api/play-admin/players/:subjectId` | 服主        | 永久删除身份                     |

管理员创建用户：

```bash
curl -X POST "$PLAYER_SERVICE/api/play-admin/players" \
  -H "Authorization: Bearer $BOX_PLAY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"player_001",
    "displayName":"玩家一号",
    "password":"change-me-123",
    "role":"player",
    "boxId":"",
    "tags":["白名单"],
    "adminNote":"由服主创建"
  }'
```

`subjectId` 是不可变玩家 UUID（API 使用不带连字符的 32 位形式）。创建接口返回 HTTP 201；
账号初始 `loginCount=0`、没有有效会话，并写入 `player.create` 审计记录。

修改和管理动作示例：

```json
{ "displayName": "新昵称", "tags": ["测试员"], "adminNote": "内部备注" }
{ "status": "banned", "banReason": "违规", "bannedUntil": "2026-08-20T00:00:00.000Z" }
{ "action": "revoke-sessions" }
{ "action": "reset-password", "password": "new-password-123" }
```

认证接口常见错误：`AUTH_API_KEY_NOT_CONFIGURED`（服务端 Key 未配置或不足 16 位）、
`AUTH_API_KEY_INVALID`（请求 Key 错误）、`AUTH_ORIGIN_NOT_ALLOWED`（Origin 未加入白名单）、
HTTP 401（玩家凭据错误）、HTTP 429（限流）、HTTP 503（数据库或身份服务不可用）。Creator/Play 在未配置
`BOX_PLAYER_LOGIN_URL` 时展示“未开启登录”，不会回退到游客或内置账号页；Player Service 的诊断 API
仍以 `LOGIN_URL_NOT_CONFIGURED` 表示该配置缺失。

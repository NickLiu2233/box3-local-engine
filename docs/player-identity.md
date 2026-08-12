# 本地玩家身份与服主管理

Local Engine 使用独立 `player-service` 镜像管理玩家身份。Creator 与 Play 都不创建游客，
也不会在 Player Service 或 PostgreSQL 不可用时降级为匿名访问。玩家必须先注册或登录，
随后才能查看工程、打开编辑器、启动地图或建立游戏 Session。

默认入口：

- 账号登录与注册：`http://127.0.0.1:3213/account`
- 服主玩家后台：`http://127.0.0.1:3213/players`

## 启动

```bash
pnpm player-service
# 已经构建过镜像时：
pnpm player-service:up
```

Player Service 必须配置 PostgreSQL、`PERMISSION_TOKEN_SECRET` 和管理令牌。Creator 与 Play
共享它签发的会话 Cookie。本机的 `127.0.0.1` 不同端口可直接共享；生产环境若使用不同
子域名，应将 `BOX_PLAYER_COOKIE_DOMAIN` 配置为共同父域（例如 `.example.com`），并启用
HTTPS。三个服务使用完全不同的顶级域名时不能共享登录 Cookie。

## 游戏脚本身份字段

| 字段 | 含义 |
| --- | --- |
| `entity.player.userKey` | 服务端从稳定 subject 签名出的伪名键，推荐作为玩家存档键 |
| `entity.player.userId` | PostgreSQL 账号 ID |
| `entity.player.boxId` | 唯一登录用户名 |
| `entity.player.name` | 服主可管理的游戏昵称 |

不要用昵称、IP 或临时 `player.id` 作为长期存档键。`PERMISSION_TOKEN_SECRET` 更换后
`userKey` 会变化，正式部署后不得随意轮换。

## PostgreSQL 数据

默认 schema 为 `box_identity`：

- `principals`：稳定 subject、创建时间、首次/最后访问时间与 IP；
- `users`：用户名、昵称、密码摘要、头像、角色、状态、注册 IP、最后登录时间/IP和登录次数；
- `sessions`：有效设备会话、创建/最后访问时间与 IP、User-Agent 和过期时间；
- `login_events`：每一次成功登录的时间、IP 与 User-Agent；
- `audit_logs`：服主修改资料、封禁、强制下线和删除等敏感操作；
- `player_revocations`：通知运行中的 Creator/Play 立即断开被封禁或强制下线的玩家。

密码只保存带随机 salt 的 scrypt 摘要，不保存明文。登录接口按 IP 限流，并对不存在的账号
执行等成本的密码派生，降低账号枚举风险。

## 服主功能

玩家后台提供账号搜索、昵称与角色调整、封禁/解封、有效设备查看、强制下线、登录历史、
注册和最后登录 IP、User-Agent、活跃统计与服主操作审计。管理接口需要
`BOX_PLAY_ADMIN_TOKEN`，不要将 Player Service 管理入口直接暴露到公网。

旧版本产生的游客行不会再获得会话，也不会出现在新注册流程中。服主确认无需保留旧游客
记录后，可在管理后台删除；升级过程不会自动删除历史数据。

## 入口守卫

身份校验覆盖 Creator 工程列表、工程 API、编辑器、Play 作品列表、启动页、地图页及
`createSession`。未登录请求会被重定向至账号页；API 请求返回 HTTP 401 和
`AUTH_REQUIRED`，不能通过直接拼接 URL 绕过。

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
| `entity.player.boxId` | 管理员绑定的旧平台神岛 ID；未绑定时为空字符串 |
| `entity.player.name` | 服主可管理的游戏昵称 |

不要用昵称、IP 或临时 `player.id` 作为长期存档键。`PERMISSION_TOKEN_SECRET` 更换后
`userKey` 会变化，正式部署后不得随意轮换。

神岛 ID 由 Player Service 的玩家管理后台单独维护。服主和管理员可以绑定、修改或
清除；普通玩家不能自行设置。该字段只兼容旧地图脚本，不参与登录、权限判断或存档
隔离。绑定变更会在玩家下一次建立地图连接时生效。

## PostgreSQL 数据

默认 schema 为 `box_identity`：

- `principals`：稳定 subject、创建时间、首次/最后访问时间与 IP；
- `users`：用户名、可选神岛 ID、昵称、密码摘要、头像、角色、状态、注册 IP、最后登录时间/IP和登录次数；
- `sessions`：有效设备会话、创建/最后访问时间与 IP、User-Agent 和过期时间；
- `login_events`：每一次成功登录的时间、IP 与 User-Agent；
- `audit_logs`：服主修改资料、封禁、强制下线和删除等敏感操作；
- `player_revocations`：通知运行中的 Creator/Play 立即断开被封禁或强制下线的玩家。

密码只保存带随机 salt 的 scrypt 摘要，不保存明文。登录接口按 IP 限流，并对不存在的账号
执行等成本的密码派生，降低账号枚举风险。

## 服主功能

玩家后台当前覆盖：

- 按用户名、昵称、身份 ID、标签和服主备注搜索，按角色、状态、在线情况筛选；
- 昵称、头像、角色、标签与内部备注维护，临时或永久封禁及自动解封；
- 单设备撤销、全部设备强制下线、批量封禁/解封/下线/标签操作；
- 注册、登录、最后在线 IP 和 User-Agent，设备系统与浏览器识别；
- 单玩家登录历史、管理操作时间线，以及近 90 天共享登录 IP 的关联账号排查线索；
- 失败登录高频来源、共享登录 IP、即将到期封禁、过期会话等安全指标；
- 按当前筛选条件导出 CSV（最多 10000 条，并防止表格公式注入）；
- 仅服主执行密码重置、身份删除和过期会话清理，所有敏感操作写入审计日志。

普通玩家不能进入后台；`moderator` 可以查看和管理普通玩家，但不能管理其他管理员；
`admin` 或 `BOX_PLAY_ADMIN_TOKEN` 拥有服主权限。不要将 Player Service 管理入口直接暴露
到公网，生产环境应在反向代理增加 HTTPS、访问控制和请求日志。

旧版本产生的游客行不会再获得会话，也不会出现在新注册流程中。服主确认无需保留旧游客
记录后，可在管理后台删除；升级过程不会自动删除历史数据。

## 入口守卫

身份校验覆盖 Creator 工程列表、工程 API、编辑器、Play 作品列表、启动页、地图页及
`createSession`。未登录请求会被重定向至账号页；API 请求返回 HTTP 401 和
`AUTH_REQUIRED`，不能通过直接拼接 URL 绕过。

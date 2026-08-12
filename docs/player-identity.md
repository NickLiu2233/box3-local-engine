# 本地玩家身份与管理

Local Engine 使用独立的 `player-service` 镜像提供本地玩家身份，不依赖 boxes 的 OAuth、
社交、支付或防沉迷系统。创作端预览和游玩端都通过它读取同一位玩家；每个浏览器首次访问
时会获得独立游客身份，游客可以升级为 PostgreSQL 本地账号。

默认入口是 `http://127.0.0.1:3213/`。`player-service` 是玩家身份数据的唯一写入者；
Creator 和 Play 不直接读写 `box_identity`，只通过内部接口获取身份和签名断言。

玩家服务与另外两个镜像独立构建和升级：

```bash
pnpm player-service       # 构建、导出镜像归档并启动
pnpm player-service:up    # 使用已有镜像直接启动
```

第一个命令会生成 `apps/local-engine/dist/images/player-service-image.tar`。运行
`pnpm creator` 或 `pnpm play` 不会再触发玩家服务编译。

## 身份字段

| 脚本字段 | 游客 | 已登录账号 | 含义 |
| --- | --- | --- | --- |
| `entity.player.id` | 有值 | 有值 | 当次连接的运行时实体 ID，重连后可变，不可用作存档键 |
| `entity.player.userKey` | 稳定 | 稳定 | 服务端生成的伪名身份；游客升级账号前后不变，推荐作为存档键 |
| `entity.player.userId` | 空字符串 | PostgreSQL 账号 ID | 保持 boxes 中“游客无 userId”的语义 |
| `entity.player.boxId` | 空字符串 | 本地用户名 | 账号的唯一登录名 |
| `entity.player.name` | 游客昵称 | 账号昵称 | 玩家在地图中的显示名 |
| `entity.player.avatar` | 空 | 可由服主设置 | 头像资源字段 |

`userKey` 由稳定的玩家 subject 和 `PERMISSION_TOKEN_SECRET` 签名得到。不要使用 `player.id`、昵称或 IP 地址作为玩家存档键。

## 配置

```env
# 正式服必须固定，可用 openssl rand -hex 32 生成
PERMISSION_TOKEN_SECRET=一段长期保存的随机值

# 玩家身份的唯一事实来源；player-service 启动前应完成配置
BOX_DATABASE_URL=postgresql://user:password@host:5432/database
BOX_IDENTITY_DATABASE_SCHEMA=box_identity
BOX_PLAYER_REGISTRATION_ENABLED=true

# 只有经过可信反向代理时才开启，用于读取 X-Forwarded-For
BOX_TRUST_PROXY=false
```

PostgreSQL 会自动创建独立 schema，其中包含：

- `principals`：游客和账号共用的稳定 subject、首次和最后访问时间/IP；
- `users`：用户名、昵称、scrypt 密码摘要、角色、状态、注册 IP、最后登录和登录次数；
- `sessions`：只保存随机会话令牌的 SHA-256 摘要，并记录会话时间、IP 和客户端；
- `login_events`：每个账号最近登录记录的数据源；
- `audit_logs`：服主修改或删除玩家的审计记录。

账号表与地图 `getDataStorage/getGroupStorage` 的表完全分开。删除玩家账号不会猜测或删除地图脚本自定义的存档键。

## 创作端、游玩端与服主入口

- 登录、注册和玩家管理界面只由 3213 端口的独立玩家服务提供。Play 不展示这些入口，
  `/account` 与 `/players` 在 Play 镜像中均返回 404。
- 创作端保留服主入口并跳转到玩家服务；服主也可以直接访问玩家服务。
- 创作端预览和游玩端建立 Session 时，会调用 `player-service` 的内部接口；两个端共用
  `PERMISSION_TOKEN_SECRET`，浏览器无法直接调用该接口。
- 游客注册时会原地升级当前 subject，因此 `userKey` 和原存档保持不变。
- 服主在玩家中心使用 `BOX_PLAY_ADMIN_TOKEN` 验证后进入 `/players`。
- 玩家后台按运营概览、玩家身份、账号与权限、安全审计分类，展示真实规模、活跃、会话、
  登录 IP 和服主操作；点击玩家可查看有效会话及最近 20 条登录记录。
- 服主可单独强制玩家全部设备下线，不必先封禁账号。
- 封禁会撤销该玩家的所有本地登录会话；玩家下次建立游戏 Session 也会被拒绝。

## 安全与备份

- 账号、密码摘要和会话只在服务端和 PostgreSQL 中，不打入地图包。
- IP 和客户端信息只通过服主鉴权接口展示。升级前已有的历史数据无法反推，会显示“历史数据未记录”。
- 直连部署保持 `BOX_TRUST_PROXY=false`；只有请求必定经过可信反向代理时才设为 `true`，否则客户端可能伪造 IP 请求头。
- 浏览器 Cookie 使用 `HttpOnly` 和 `SameSite=Lax`；配置 HTTPS 公网地址后会自动加 `Secure`。
- 定期备份 PostgreSQL 的 `box_identity` schema 以及 `PERMISSION_TOKEN_SECRET`。
- 更换 `PERMISSION_TOKEN_SECRET` 会使游客 Cookie 失效并改变所有 `userKey`，不应作为常规轮换项。

同一主机的不同端口会共享该主机 Cookie，因此默认的 `3000/3002/3213` 部署可识别为同一
玩家。公网部署建议把三个服务放在同一个 HTTPS 站点的反向代理后；如果使用不同域名，必须
另外设计统一 Cookie 域和安全策略，不能只修改端口。

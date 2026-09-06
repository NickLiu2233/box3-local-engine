# Player Service API

默认地址是 `http://127.0.0.1:3124`。响应为 JSON；错误格式为：

```json
{ "message": "错误说明" }
```

外部认证接口必须带服务端请求头 `x-box-player-auth-key: <BOX_PLAYER_AUTH_API_KEY>`。密钥不能进入浏览器；登录门户应在服务端代理请求。接口只接受已配置 Origin，并用 `HttpOnly` Cookie 保存会话。

## 玩家认证

### `POST /api/player-auth/register`

创建玩家并写入会话。请求：

```json
{ "username": "player_01", "displayName": "玩家一号", "password": "至少10位密码" }
```

用户名以字母开头，只能含字母、数字、下划线，长度 3–32；昵称 1–32；密码 10–128。成功返回 `201`：

```json
{
  "player": {
    "subjectId": "32位身份ID",
    "userId": "用户ID",
    "username": "player_01",
    "displayName": "玩家一号",
    "avatarSkinId": "explorer",
    "role": "player",
    "status": "active"
  }
}
```

失败：`400` 参数或用户名冲突，`403` 注册关闭或 IP/设备封禁，`429` 注册限流。

### `POST /api/player-auth/login`

请求：

```json
{ "username": "player_01", "password": "至少10位密码" }
```

成功返回 `200` 和同样的 `player` 对象，并写入新会话。每个普通玩家只允许一个设备会话，新登录会撤销旧会话。失败：`401` 用户名或密码错误，`403` IP/设备封禁，`429` 登录限流（带 `Retry-After`）。

### `GET /api/player-auth/session`

```json
{
  "player": {
    "subjectId": "…",
    "username": "player_01",
    "displayName": "玩家一号",
    "avatarSkinId": "explorer",
    "role": "player",
    "status": "active"
  },
  "databaseEnabled": true,
  "registrationEnabled": true
}
```

未登录时 `player` 为 `null`。数据库或认证服务不可用时返回 `503`。

### `POST /api/player-auth/logout`

删除当前会话并清除 Cookie，返回：

```json
{ "loggedOut": true }
```

## 玩家资料（内部接口）

### `PATCH /api/player-internal/profile`

仅 Creator、Play 或可信服务端内部调用，需要内部身份鉴权，不对浏览器开放。

```json
{ "displayName": "新昵称", "avatarSkinId": "pilot" }
```

至少提供一个字段。皮肤仅支持：`explorer`、`pilot`、`cowboy`、`chinese-doll`、`pink-girl`、`maid`、`little-prince`、`christmas-girl`。成功返回：

```json
{
  "player": {
    "subjectId": "…",
    "username": "player_01",
    "displayName": "新昵称",
    "avatarSkinId": "pilot"
  }
}
```

`role`、`adminPermissions`、`avatar` 等字段会被拒绝。

## 玩家管理 API

以下接口位于 `/api/play-admin/`，使用独立后台 Cookie 或服主临时会话；普通玩家 Cookie 无效。未授权为 `401/403`，参数错误为 `400`。

| 方法                    | 路径                     | 权限             | 用途                        |
| ----------------------- | ------------------------ | ---------------- | --------------------------- |
| `POST`                  | `/login`                 | 无               | 管理员登录，写入后台 Cookie |
| `POST`                  | `/owner-session`         | 服主密钥         | 创建临时服主会话            |
| `GET`                   | `/verify`                | `players.view`   | 返回后台身份与权限          |
| `GET`                   | `/players`               | `players.view`   | 分页查询玩家                |
| `POST`                  | `/players`               | `players.create` | 新建普通玩家                |
| `GET/PATCH/POST/DELETE` | `/players/:subjectId`    | 见下文           | 玩家详情、维护、命令、删除  |
| `POST`                  | `/players/batch`         | 对应操作权限     | 批量操作                    |
| `GET`                   | `/players/overview`      | `players.view`   | 概览与安全指标              |
| `GET`                   | `/players/export`        | `players.export` | 导出 CSV                    |
| `GET`                   | `/activity`              | `audit.view`     | 登录与管理审计分页查询      |
| `POST`                  | `/maintenance`           | 服主             | 清理已过期会话              |
| `GET/POST`              | `/admins`                | 服主             | 查询或创建后台管理账号      |
| `PATCH/DELETE`          | `/admins/:id`            | 服主             | 修改或删除后台管理账号      |
| `GET/POST`              | `/permission-groups`     | 服主             | 查询或创建权限组            |
| `PATCH/DELETE`          | `/permission-groups/:id` | 服主             | 修改或删除权限组            |

### 查询与创建

`GET /players` 查询参数：`search`、`page`、`pageSize`（10–100）、`identity`（`all|user|banned`）、`online`（`all|online|offline`）和 `sort`（`lastSeen|registered|displayName|loginCount`）。返回：

```json
{
  "players": [
    {
      "subjectId": "…",
      "username": "player_01",
      "displayName": "玩家一号",
      "status": "active",
      "tags": [],
      "loginCount": 2
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 30,
  "totalPages": 1
}
```

`POST /players` 请求为 `username`、`displayName`、`password`，可选 `boxId`、`tags`（最多 20 个）和 `adminNote`。只能创建普通玩家。

### 单玩家维护

`PATCH /players/:subjectId` 可修改 `displayName`、`tags`、`adminNote`、`boxId`，以及 `status`、`banReason`、`bannedUntil`。昵称最多 32，备注最多 2000，封禁原因最多 500。只有服主可以修改 `creatorAccess` 与 `creatorPermissions`。

`POST /players/:subjectId` 使用下列请求：

```json
{ "action": "revoke-sessions" }
{ "action": "revoke-session", "sessionId": "16位会话ID" }
{ "action": "reset-password", "password": "至少10位密码" }
{ "action": "ban-ip", "value": "IP或设备标识", "reason": "可选", "bannedUntil": null }
{ "action": "unban-source", "banId": "封禁记录ID" }
```

`DELETE /players/:subjectId` 仅服主可用，成功返回 `{ "deleted": true }`。

### 批量与权限

`POST /players/batch` 的 `subjectIds` 为 1–100 个身份 ID；支持 `revoke-sessions`、`ban`、`unban`、`add-tag`、`remove-tag`。

可分配权限：`players.view`、`players.manage`、`players.ban`、`sessions.manage`、`identity-bans.manage`、`players.create`、`players.export`、`passwords.reset`、`audit.view`。`admin` 拥有全部后台权限；`moderator` 仅拥有分配权限；服主身份不可授予。

创作者权限与后台权限相互独立：

| 权限              | 用途                         |
| ----------------- | ---------------------------- |
| `projects.view`   | 进入创作端并查看地图         |
| `projects.create` | 创建主地图或副地图           |
| `projects.edit`   | 编辑地图资料、内容和运行配置 |
| `projects.delete` | 删除地图或地图组             |
| `projects.import` | 导入工程或副地图             |
| `projects.export` | 导出工程或游玩包             |
| `models.manage`   | 进入 VOXA 并维护模型工程     |

`creatorAccess=false` 会阻止进入 Creator 与 VOXA；仅设置 `models.manage` 时可以管理模型，但不能获得地图编辑权限。创作者授权只能由服主修改。

### 管理账号与权限组

创建后台账号需要 `username`、`displayName`、至少 12 位的 `password`、`role`（`admin|moderator`），可选 `permissions` 和 `permissionGroupId`。管理员账号 ID 和权限组 ID 均为 UUID。更新账号可修改昵称、密码、角色、权限组、直接权限和 `status`（`active|disabled`）。

权限组请求为：

```json
{
  "name": "客服组",
  "permissions": ["players.view", "players.manage", "sessions.manage"]
}
```

服主会话来自 `BOX_PLAY_ADMIN_TOKEN`，不是一种可创建或分配的后台账号；维护管理员、权限组和删除玩家均只接受服主会话。

### 审计与维护

`GET /activity` 支持 `kind=all|login|admin`、`search`、`page` 和 `pageSize`。`POST /maintenance` 当前只接受：

```json
{ "action": "cleanup-expired-sessions" }
```

审计只在操作实际成功且造成变化后写入；取消界面操作、参数校验失败、删除不存在对象或无变化维护不会产生成功审计。

## 状态码

| 状态  | 含义                             |
| ----- | -------------------------------- |
| `400` | 参数或业务条件无效               |
| `401` | 认证或会话无效                   |
| `403` | Origin、权限、注册开关或封禁拒绝 |
| `404` | 服务模式或路径不可用             |
| `405` | HTTP 方法不支持                  |
| `429` | 登录或注册过于频繁               |
| `503` | 数据库或认证服务未就绪           |

本文以当前路由和 Zod 校验为准；接口变动应同步更新文档和回归测试。

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

| 方法                    | 路径                             | 权限                               | 用途                                          |
| ----------------------- | -------------------------------- | ---------------------------------- | --------------------------------------------- |
| `POST`                  | `/login`                         | 无                                 | 管理员登录，写入后台 Cookie                   |
| `POST`                  | `/owner-session`                 | 服主密钥                           | 创建临时服主会话                              |
| `GET`                   | `/verify`                        | `players.view`                     | 返回后台身份与权限                            |
| `POST`                  | `/self-password`                 | `players.view`（仅管理员账号会话） | 修改当前管理员自己的密码                      |
| `GET`                   | `/players`                       | `players.view`                     | 分页查询玩家                                  |
| `POST`                  | `/players`                       | `players.create`                   | 新建普通玩家                                  |
| `GET/PATCH/POST/DELETE` | `/players/:subjectId`            | 见下文                             | 玩家详情、维护、命令、删除                    |
| `POST`                  | `/players/batch`                 | 对应操作权限                       | 批量操作                                      |
| `GET`                   | `/players/overview`              | `players.view`                     | 概览与安全指标                                |
| `GET`                   | `/players/export`                | `players.export`                   | 导出 CSV                                      |
| `GET`                   | `/activity`                      | `audit.view`                       | 登录与管理审计分页查询                        |
| `GET/POST`              | `/identity-bans`                 | 查看/管理来源封禁                  | 查询或维护 IP、设备封禁                       |
| `POST`                  | `/maintenance`                   | 服主                               | 清理已过期会话                                |
| `GET/POST`              | `/admins`                        | 服主                               | 查询或创建后台管理账号                        |
| `PATCH/DELETE`          | `/admins/:id`                    | 服主                               | 修改或删除后台管理账号                        |
| `GET/POST`              | `/permission-groups`             | 服主                               | 查询或创建权限组                              |
| `PATCH/DELETE`          | `/permission-groups/:id`         | 服主                               | 修改或删除权限组                              |
| `GET/POST`              | `/container-resource-groups`     | `containers.view/manage`           | 查询或创建地图容器资源组                      |
| `PATCH/DELETE`          | `/container-resource-groups/:id` | `containers.manage`                | 修改或删除资源组                              |
| `GET/POST`              | `/containers`                    | `containers.view/manage`           | 查询运行容器，保存地图容量配置或执行重启/销毁 |
| `DELETE`                | `/containers/:mapId`             | `containers.manage`                | 删除地图组或单图容器配置                      |
| `GET`                   | `/library/worlds`                | `play-maps.view`                   | 查询已导入游玩地图                            |
| `PATCH/DELETE`          | `/library/worlds/:id`            | `play-maps.manage`                 | 设置、开放或删除游玩地图                      |
| `GET`                   | `/library/world-status`          | `play-maps.view`                   | 查询游玩地图资源状态                          |
| `GET/PATCH`             | `/library/resource-cache`        | `play-resource-cache.view/manage`  | 查询或开关服务器级本地资源加速                |
| `GET/POST/DELETE`       | `/library/import`                | `play-maps.view/manage`            | 预览、确认导入或取消 `.boxplay` 审查          |

`/library/*` 由 Player Service 先完成后台身份与能力检查，再代理到 Play 管理服务；浏览器不直接持有 Play 内部管理凭据。`/containers` 的 `POST` 使用 `action=restart|destroy` 时返回异步接受或无内容响应；保存配置时返回保存后的 profile。

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

可分配权限覆盖玩家、会话、账号/IP/设备封禁、创作权限、Creator CLI Token、游玩地图、地图容器和审计。每个功能都有独立查看能力，编辑/管理能力自动包含其对应查看能力。新建管理账号必须选择权限组，菜单可见性和 API 授权都由该组决定。服主身份不可授予。“本地资源加速”会影响所有玩家的设备存储，因此 `play-resource-cache.*` 只内建给服主和管理员，不可授予权限组。

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

创建后台账号需要 `username`、`displayName`、至少 12 位的 `password` 和 `permissionGroupId`。账号默认是管理员；管理员账号 ID 和权限组 ID 均为 UUID。更新账号可修改昵称、密码、权限组和 `status`（`active|disabled`）；不再接受角色或直接权限字段。

权限组请求为：

```json
{
  "name": "客服组",
  "permissions": ["players.view", "players.manage", "sessions.view", "sessions.manage"]
}
```

服主会话来自 `BOX_PLAY_ADMIN_TOKEN`，不是一种可创建或分配的后台账号；维护管理员、权限组和删除玩家均只接受服主会话。创建、更新、删除资源组时，如果资源组已经被地图容器配置使用，删除会被拒绝。资源组包括 CPU（毫核）、内存（MB）、容器进程上限、网络策略（不限制或仅内网）、可选的出网带宽上限（Mbps）及资源说明；这些限制仅在新的独立地图容器启动或重启后生效。

### 当前管理员修改密码

`POST /self-password` 仅接受使用用户名和密码登录的管理账号，服主密钥会话不能替代当前密码。请求：

```json
{ "currentPassword": "当前密码", "newPassword": "至少12位的新密码" }
```

成功返回 `{ "changed": true }`，并立即清除当前后台会话；客户端应返回登录页。密码错误、长度不足或不匹配返回 `400`，停用账号和无效会话返回 `401/403`。

### 后台能力矩阵

权限组保存 capability 字符串。每一项编辑能力都需要并自动包含同一工作流的查看能力：

| 菜单分类                   | 查看能力              | 编辑/管理能力                                                                             |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| 玩家账号                   | `players.view`        | `players.manage`、`players.create`、`players.export`、`players.delete`、`passwords.reset` |
| 在线会话                   | `sessions.view`       | `sessions.manage`                                                                         |
| 账号封禁                   | `account-bans.view`   | `players.ban`                                                                             |
| IP / 设备封禁              | `identity-bans.view`  | `identity-bans.manage`                                                                    |
| 玩家创作权限               | `creator-access.view` | `creator-access.manage`                                                                   |
| Creator CLI Token          | `creator-tokens.view` | `creator-tokens.manage`                                                                   |
| 游玩地图                   | `play-maps.view`      | `play-maps.manage`                                                                        |
| 容器管理、资源组和地图配置 | `containers.view`     | `containers.manage`                                                                       |
| 安全记录                   | `audit.view`          | 无写能力                                                                                  |

服主拥有全部能力但不可被权限组授予。新建管理账号必须分配权限组，菜单可见性和服务端授权都会按该组限制。历史无权限组或旧 `admin` 角色记录仅用于升级兼容，下一次保存账号时会收敛到权限组模型，不应作为新的授权方式。完整的前端与服务端维护顺序见[管理后台开发说明](./player-admin-development.md)。

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

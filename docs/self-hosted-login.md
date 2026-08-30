# 自建登录门户接入指南

BOX3 Engine 的 Creator 和 Play 不绑定某一个登录网页。Player Service 提供认证 API；服主可以使用自己的品牌、框架和账号体系编写一个独立登录门户。

完整接口字段请看[Player Service API](./player-service-api.md)。仓库中的[独立登录门户示例](../examples/player-auth-portal/README.md)可直接部署，也可作为服务端实现参考。

## 当前实现边界

- `player-auth-portal` 是可独立部署的参考门户，不属于 Creator、Play、VOXA 或 Player Service 镜像本身。
- 当前完整离线包仍携带该参考门户镜像，便于首次测试；服主使用自建门户时无需使用它。
- 图形化启动器当前会按“全部服务 / 创作端 / 游玩端”协调参考门户。完全移除该镜像并在启动器中选择外部门户属于后续版本管理能力；在当前版本中，使用外部门户时请通过 Compose/环境配置自行启动所需服务。

## 接入流程

1. 部署 Player Service，并配置一个仅限服务端保存的 `BOX_PLAYER_AUTH_API_KEY`。
2. 部署服主自己的登录网站；它必须包含服务端，不是纯静态 HTML。
3. 在 Player Service 的配置中填写登录门户地址和允许来源。
4. 登录门户的服务端携带 API Key 调用 Player Service；浏览器只调用登录门户自己的 API。
5. 登录成功后，门户验证 `returnUrl` 并跳回 Creator 或 Play。

最小配置示例：

```env
BOX_PLAYER_SERVICE_PUBLIC_URL=https://player.example.com
BOX_CREATOR_PUBLIC_URL=https://creator.example.com
BOX_PLAY_PUBLIC_URL=https://play.example.com
BOX_PLAYER_LOGIN_URL=https://login.example.com/login
BOX_PLAYER_AUTH_API_KEY=<仅保存于服务端的随机密钥>
BOX_PLAYER_AUTH_ALLOWED_ORIGINS=https://login.example.com
BOX_PLAYER_COOKIE_DOMAIN=.example.com
```

未配置 `BOX_PLAYER_LOGIN_URL` 时，Creator 和 Play 会提示“未开启登录”；不会跳转到默认账号页。

## 必须有服务端代理

Player Service 的认证接口要求请求头：

```http
X-Box-Player-Auth-Key: <BOX_PLAYER_AUTH_API_KEY>
```

因此浏览器 JavaScript、静态网页、移动端包和公开仓库都不能持有该值。正确链路为：

```text
浏览器
  → 服主登录门户的后端
  → Player Service /api/player-auth/*
  → PostgreSQL
```

门户后端需要转发登录、注册、查询会话和退出时的 Cookie，并将 Player Service 的全部 `Set-Cookie` 原样回传给浏览器。参考实现见[示例门户](../examples/player-auth-portal/README.md)。

## 回跳与域名限制

Creator/Play 跳转到门户时会附加：

- `source=creator|play`
- `returnUrl=<已校验的 Creator 或 Play 地址>`

门户只能返回自身配置白名单中的 Creator/Play 地址，不能把任意 `returnUrl` 当成可信地址，否则会形成开放重定向漏洞。

生产环境建议让登录页、Creator、Play 与 Player Service 使用同一主域名的 HTTPS 子域，例如 `login.example.com`、`play.example.com` 和 `player.example.com`，再配置共同的 `BOX_PLAYER_COOKIE_DOMAIN=.example.com`。跨站 Cookie、HTTP 明文和不受控反向代理都会导致登录状态丢失或被伪造。

## 推荐的 API 使用边界

| 场景                     | 使用接口                             | 谁调用           |
| ------------------------ | ------------------------------------ | ---------------- |
| 玩家注册                 | `POST /api/player-auth/register`     | 登录门户后端     |
| 玩家登录                 | `POST /api/player-auth/login`        | 登录门户后端     |
| 查询当前会话             | `GET /api/player-auth/session`       | 登录门户后端     |
| 玩家退出                 | `POST /api/player-auth/logout`       | 登录门户后端     |
| 创建用户、封禁、删除用户 | `/api/play-admin/players*`           | 独立玩家管理账号 |
| 维护后台管理账号         | `/api/play-admin/admins*`            | 仅服主密钥会话   |
| 维护管理员权限组         | `/api/play-admin/permission-groups*` | 仅服主密钥会话   |

管理 API 不接受普通玩家 Cookie。服主不是可分配的账号角色，`BOX_PLAY_ADMIN_TOKEN` 只兑换短期 HttpOnly 服主会话；认证 API Key
与服主密钥都不能出现在面向玩家的网页中，也不应通过 URL、浏览器本地存储、日志或截图传递。

## 自建门户发布前检查

- [ ] API Key 仅存在于 Player Service 和门户后端的秘密配置中。
- [ ] `returnUrl` 只允许 Creator/Play 的明确白名单地址。
- [ ] 登录、注册、会话、退出均转发 Cookie 与全部 `Set-Cookie`。
- [ ] 使用 HTTPS；只有可信反向代理才设置 `BOX_TRUST_PROXY=true`。
- [ ] 认证失败、限流、数据库不可用等错误可被门户清晰展示，但不泄露密钥或内部连接信息。
- [ ] 已验证封禁、会话撤销、管理员与服主权限分层。

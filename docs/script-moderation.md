# 让地图脚本参与玩家管理

有些玩法需要自动处理挂机、刷屏或异常行为。现在可以在地图服务端脚本里调用 `world.moderation`，不用把管理员密码或服主密钥写进地图。

这不是一个给玩家客户端开放的管理接口。只有服主授权的服务端脚本能使用，客户端传来的参数仍需由你的玩法代码检查。

## 先在后台授权

1. 用服主密钥登录玩家管理后台，创建一个权限组和管理账号。
2. 只给需要的权限：封禁账号用「封禁玩家账号」，封禁 IP 用「管理 IP / 设备封禁」，查询状态用「查看玩家账号」。
3. 如果这个账号只负责自动化，编辑账号并关闭「允许登录管理后台」。这不会停用地图授权；选择「停用账号」才会同时停用两者。
4. 在「管理账号 → 地图脚本授权」创建授权 Key，选择账号、有效期和最长封禁时间。默认只允许本地图处罚；全服处罚要额外确认。
5. 在地图服务端控制台读取下面两个值，填入「绑定地图」并选择刚创建的授权。

```js
console.log(world.moderation.mapId)
console.log(world.moderation.scriptFingerprint)
```

这里的 Key 是保存在后台的授权记录，不是需要复制进脚本的密码。修改服务端脚本后，要重新运行地图、读取新指纹并绑定。复制地图不能直接继承另一张地图的授权。

## 在脚本里调用

目标是当前地图中的玩家实体，不是自己填写的账号 ID 或 IP。

```js
async function punish(playerEntity, incidentId) {
  const ban = await world.moderation.banPlayer(playerEntity, {
    reason: '持续刷屏',
    durationSeconds: 600,
    requestId: `spam-${incidentId}`,
  })
  return ban.id
}
```

`incidentId` 要对应一次真实事件。同一次操作重试时保留 `requestId`，新的操作再换一个；同一个 ID 不能拿来发送不同内容。ID 支持字母、数字、点、下划线和连字符，最多 80 个字符。

| 方法 | 用途 | 所需权限 |
| --- | --- | --- |
| `banPlayer(entity, options)` | 封禁这个玩家账号 | `players.ban` |
| `banCurrentIP(entity, options)` | 封禁该玩家当前连接的 IP | `identity-bans.manage` |
| `revokeBan(banId, { reason, requestId })` | 解除当前授权在本图创建的处罚 | 对应处罚的封禁权限 |
| `getPlayerStatus(entity)` | 查看账号状态、本图内该账号的处罚记录 | `players.view` |

封禁结果包含 `id`、`scope` 和 `expiresAt`。解除处罚时使用返回的 `id`：

```js
await world.moderation.revokeBan(banId, {
  reason: '复核后解除',
  requestId: `review-${incidentId}`,
})
```

本地图是默认范围，玩家在其他地图不受影响。需要全服处罚时，授权必须允许全服范围，调用也必须显式传入 `scope: 'server'`。

```js
await world.moderation.banCurrentIP(playerEntity, {
  scope: 'server',
  reason: '确认的恶意请求',
  durationSeconds: 600,
  requestId: `abuse-${incidentId}`,
})
```

共享网络里的多个玩家可能使用同一个 IP，优先使用账号封禁。无效地址、本机回环地址、正在使用的后台管理会话 IP 不能由脚本封禁。

## 被拒绝或超时怎么办

调用失败会拒绝 Promise，需要 `try/catch`。超时不代表服务端一定没有执行成功；重试时使用原来的 `requestId` 和参数。

如果封禁已生效、目标已离线，重试可能提示玩家已离线。此时在后台复核处罚，不要换一个请求 ID 反复封禁。

每次调用都会重新检查账号、权限组、授权有效期和脚本指纹。地图每分钟最多 20 次调用，单个授权每分钟最多 60 次，最多同时等待 8 个请求。授权最长 30 天，单次封禁最多 7 天，也不能超过服主为该授权设定的上限。

封禁会断开目标玩家；本地图的其他房间通过轮询同步，默认间隔约 10 秒。重新进入时会先检查处罚。身份服务不可用时，新进入的连接会被拒绝；已在房间里的玩家不会因为一次轮询失败被全部踢出。

脚本只能解除同一授权、同一地图创建的处罚，不能解除人工创建的全服封禁。如果管理员后来修改了全服账号处罚，旧脚本也不能覆盖这次人工决定。

服主可以在「地图脚本授权 → 地图封禁」解除地图内的处罚。全服账号和 IP 封禁仍在原有后台页面管理。撤销 Key 只停止后续调用，不会自动撤销已有处罚；已有处罚按设定期限到期。

## 维护与部署

管理界面和运行时请求都使用 `@box/apis` 生成的 OpenAPI 客户端。浏览器的授权配置接口只接受服主会话，并沿用后台的来源与 CSRF 校验。

运行时接口是 `/api/player-internal/script-moderation` 和 `/api/player-internal/map-admission`，使用现有内部 Bearer 鉴权。密钥只保存在可信引擎进程里，不能给地图脚本，也不能放进自定义登录门户的前端。反向代理应限制这些内部路径；这项设计不防御服主机器或可信引擎进程本身被攻破。

永久地图 ID、脚本指纹、玩家账号与连接 IP 都由引擎填写，沙箱请求无法覆盖。授权变更、处罚结果和成功操作审计在同一数据库事务内提交；写入审计失败时，处罚会回滚。

更新时需要一起构建 Player Service、玩家管理前端和 Game Server，不能只更新管理页面。首次使用会自动添加授权与地图封禁表，并给管理账号增加后台登录开关；已有账号默认允许登录。

相关代码：`apps/game/server/script-moderation-{store,service}.ts` 管理授权和处罚，`services/game-server/src/moderation/` 负责可信引擎与脚本之间的调用，`apps/player-admin/src/pages/access/script-moderation-dialog.tsx` 是服主授权界面。新增源码文件都少于 500 行。

回归测试：`apps/game/scripts/check-script-moderation.ts` 只接受本机的 `moderation_test` 数据库和同名 schema，测试时会创建账号，必须使用一次性测试数据库。脚本桥接测试在 Game Server 下运行 `node -r @swc-node/register scripts/regression-script-moderation.ts`。

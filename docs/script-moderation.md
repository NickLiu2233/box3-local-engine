# 让地图脚本参与玩家管理

有些玩法需要自动处理挂机、刷屏或异常行为。现在可以在地图服务端脚本里调用 `world.moderation`，不用把管理员密码或服主密钥写进地图。

这不是一个给玩家客户端开放的管理接口。只有服主授权的服务端脚本能使用，客户端传来的参数仍需由你的玩法代码检查。

## 先在后台授权

1. 用服主密钥登录玩家管理后台，打开「服主管理 → 地图管理 Key」。
2. 点击「创建 Key」，选择地图，勾选需要的权限并确认。默认仅本地图、单次封禁最多 1 小时、Key 有效期 7 天；其他配置在「高级设置」里。
3. 后台自动读取版本并完成绑定，不需要创建管理员账号，不需要复制地图 ID 或指纹。如果没有地图可选，先启动地图，再刷新列表。

指纹是服务端脚本和入口的版本摘要，不是密钥。后台优先采用游玩端的公开实例版本，防止未发布的创作草稿覆盖线上授权；没有游玩版本时可以选择创作版本。私有房间不会覆盖公共版本。

修改或发布脚本后，列表会显示“脚本已更新”。点击“更新授权 / 续期”，确认新版本，即可刷新授权并续期 7 天，不需要修改地图来取值。后台不会自动批准变化后的代码。旧版账号绑定授权仍受原账号状态限制，建议撤销后重建独立 Key。

仅在调试时，可以在创作端服务端控制台查看指纹：

```js
console.log(world.moderation.scriptFingerprint)
```

这里的 Key 是保存在后台的授权记录，不是需要复制进脚本的密码。复制地图不能直接继承另一张地图的授权。

`scriptFingerprint` 仅在创作端存在，游玩端读取会得到 `undefined`，也不会收到内部指纹配置。游玩端仍在可信引擎进程内校验指纹。相同服务端脚本和入口计算出的指纹一致；未发布的修改或入口变化会产生不同指纹。指纹是版本标识，不是管理员密钥。

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

每次调用都会重新检查 Key 的权限、有效期和脚本指纹。地图每分钟最多 20 次调用，单个授权每分钟最多 60 次，最多同时等待 8 个请求。授权最长 30 天，单次封禁最多 7 天，也不能超过服主为该授权设定的上限。

封禁会断开目标玩家；本地图的其他房间通过轮询同步，默认间隔约 10 秒。重新进入时会先检查处罚。身份服务不可用时，新进入的连接会被拒绝；已在房间里的玩家不会因为一次轮询失败被全部踢出。

脚本只能解除同一授权、同一地图创建的处罚，不能解除人工创建的全服封禁。如果管理员后来修改了全服账号处罚，旧脚本也不能覆盖这次人工决定。

服主可以在「服主管理 → 地图管理 Key → 地图封禁」解除地图内的处罚。全服账号和 IP 封禁仍在原有后台页面管理。撤销 Key 只停止后续调用，不会自动撤销已有处罚；已有处罚按设定期限到期。

## 维护与部署

### 编辑器补全与声明文件

在仓库根目录运行：

```sh
npm --prefix apps/game run build:script-types
```

这个命令会生成声明、使用现有的 `rollup-plugin-dts` 更新服务端 SDK，并更新本地编辑器内置的类型资源。最后会检查方法补全、参数字段、中文说明和类型约束，不需要增加新的依赖。

如果在 VS Code 中写地图脚本，把 `packages/script-api/dts/box3-server-api.d.ts` 复制到地图工程目录即可。这是标准的 `.d.ts` 文件，包含 `world` 等全局对象，不需要给地图安装运行时包。

需要开启脚本类型检查时，可以在工程里加入 `jsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "checkJs": true,
    "skipLibCheck": true
  },
  "include": ["**/*.js", "box3-server-api.d.ts"]
}
```

`world.moderation.` 会提示可用方法，调用时会提示参数类型，填写选项时会提示 `reason`、`durationSeconds`、`scope` 和 `requestId`。把鼠标放到方法或字段上可以查看说明。声明只用于开发提示，不会给地图增加管理权限。

管理接口的类型以 `internals/schema/api/js/moderation.ts` 为准，SDK 的对应类型由构建自动同步，不需要手动维护两份。

### 服务更新

管理界面和运行时请求都使用 `@box/apis` 生成的 OpenAPI 客户端。浏览器的授权配置接口只接受服主会话，并沿用后台的来源与 CSRF 校验。

运行时接口是 `/api/player-internal/script-moderation` 和 `/api/player-internal/map-admission`，使用独立的 `Moderation` 实例凭证，不再接受玩家身份的 Bearer。凭证绑定地图 ID、运行实例与 edit/play 模式，五分钟过期，由父启动器每分钟刷新。签发密钥 `BOX_MODERATION_SIGNING_SECRET` 不传给游戏子进程，凭证文件以 0600 权限存放在临时目录，不进入地图、网页、日志或导出包。

桌面启动器会自动生成并保留这个密钥，不需要额外填写。手动 Compose 部署需要在私有 `.env` 中配置随机签发密钥，并一起更新 Player Service、Creator/Play 和服务管理器。不要把密钥放进登录门户。

接口拒绝浏览器来源、Cookie、过期或伪造凭证，且校验请求地图与凭证范围。反向代理仍应禁止公网访问 `/api/player-internal/`，不要把 CORS、地址隐藏或代码混淆当作鉴权。这项设计不防御服主机器或可信父启动器被攻破。

永久地图 ID、脚本指纹、玩家账号与连接 IP 都由引擎填写，沙箱请求无法覆盖。授权变更、处罚结果和成功操作审计在同一数据库事务内提交；写入审计失败时，处罚会回滚。

更新时需要一起构建 Player Service、玩家管理前端和 Game Server，不能只更新管理页面。首次使用会自动迁移独立 Key、版本登记与地图封禁表；旧版账号授权不会被悄悄转换为独立授权。“允许登录管理后台”开关已移除，账号登录只受启用/停用状态控制。

相关代码：`apps/game/server/script-moderation-{store,service}.ts` 管理授权和处罚，`services/game-server/src/moderation/` 负责可信引擎与脚本之间的调用，`apps/player-admin/src/pages/access/script-moderation-dialog.tsx` 是服主授权界面。新增源码文件都少于 500 行。

回归测试：`apps/game/scripts/check-script-moderation.ts` 只接受本机的 `moderation_test` 数据库和同名 schema，测试时会创建账号，必须使用一次性测试数据库。脚本桥接测试在 Game Server 下运行 `node -r @swc-node/register scripts/regression-script-moderation.ts`。

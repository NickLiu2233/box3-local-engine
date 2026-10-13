# 地图授权与脚本处罚 API

有些玩法需要自动处理挂机或异常操作。现在可以在地图服务端脚本里调用 `world.moderation`，不用把管理员密码或服主密钥写进地图。

这不是一个给玩家客户端开放的管理接口。只有服主授权的服务端脚本能使用，客户端传来的参数仍需由你的玩法代码检查。

## 先在后台授权

1. 用服主身份登录玩家管理后台，打开「服主管理 → 地图授权」。
2. 点击「创建授权」，在「地图组」中按名称和固定地图 ID 选择地图，勾选需要的操作。
3. 设置单次封禁上限（限制时长或永久）和授权有效期（1–360 天）。处罚默认全服，默认封禁上限 60 分钟、有效期 7 天。

授权按不可修改的地图组 ID 绑定，创作端和游玩端共用同一份授权，修改或发布脚本后继续生效，无需重新授权。可以点击「编辑授权 / 续期」调整处罚设置和有效期，或撤销授权。复制地图不会继承另一地图组的授权。地图组选项直接读取创作端项目和游玩端已导入地图，同一地图组只显示一次，无需先启动地图；创建或导入地图后刷新列表即可。

授权列表右侧支持「全部状态」「授权中」「已撤销」筛选；列表还会标明已过期或已被替换的历史授权。地图名称以创作端或游玩端目录为准，旧运行记录仅作补充。

## 在脚本里调用

玩家参数使用当前地图玩家实体上的 `GamePlayer` 组件，即 `entity.player`；批量传入 `GamePlayer[]`，不能直接传实体、账号 ID 或 IP。

```js
async function punish(playerEntity, incidentId) {
    const ban = await world.moderation.banPlayer(playerEntity.player, {
        reason: '持续异常操作',
        durationSeconds: 600,
        requestId: `spam-${incidentId}`,
    });
    return ban.id;
}
```

`requestId` 可省略，运行时会为每次封禁或解除处罚调用生成唯一 ID，批量调用共用一个基础 ID 并按下标派生。省略时再次调用会生成新 ID；需要手动重试时，请像上例一样显式传入固定值。`incidentId` 要对应一次真实事件。同一次操作重试时保留 `requestId`，新的操作再换一个；同一个 ID 不能拿来发送不同内容。ID 支持字母、数字、点、下划线和连字符，最多 80 个字符。

| 方法                                      | 用途                                 | 所需权限               |
| ----------------------------------------- | ------------------------------------ | ---------------------- |
| `banPlayer(player, options)`              | 封禁这个玩家账号                     | `players.ban`          |
| `banCurrentIP(player, options)`           | 封禁该玩家当前连接的 IP              | `identity-bans.manage` |
| `banCurrentDevice(player, options)`       | 封禁该玩家当前连接的设备身份         | `identity-bans.manage` |
| `revokeBan(banId, { reason, requestId })` | 解除当前授权在本图创建的处罚         | 对应处罚的封禁权限     |
| `getPlayerStatus(player)`                 | 查看账号状态、本图内该账号的处罚记录 | `players.view`         |
| `listBans(options)`                       | 分页查询本图发起的处罚记录           | `moderation.view`      |
| `getBan(banId)`                           | 查询单条处罚详情                     | `moderation.view`      |

封禁结果包含 `id` 和 `expiresAt`；永久封禁的 `expiresAt` 为 `null`。后台允许永久封禁时，脚本可传 `durationSeconds: 0`；永久处罚持续到被解除，授权到期或撤销不会自动解除已有处罚。解除处罚时使用返回的 `id`：

```js
await world.moderation.revokeBan(banId, {
    reason: '复核后解除',
    requestId: `review-${incidentId}`,
});
```

处罚统一全服，账号封禁会禁止登录并在后台显示封禁状态。脚本参数不再提供 `scope`，后台也不再选择处罚范围。旧的服主地图授权会升级为全服授权；已有处罚保留原范围和截止时间，不会追溯扩大处罚。脚本返回的处罚记录不包含范围字段。

```js
await world.moderation.banCurrentIP(playerEntity.player, {
    reason: '确认的恶意请求',
    durationSeconds: 600,
    requestId: `abuse-${incidentId}`,
});
```

共享网络里的多个玩家可能使用同一个 IP，优先使用账号封禁。无效地址、本机回环地址不能由脚本封禁。后台管理会话使用中的 IP 可以封禁：处罚只限制玩家登录和游戏连接，不影响独立的后台管理登录和会话。

## 被拒绝或超时怎么办

调用失败会拒绝 Promise，需要 `try/catch`。超时不代表服务端一定没有执行成功；手动重试须事先显式指定 `requestId`，重试时复用原 ID 和参数。未指定 ID 的超时操作应先复核处罚，不能直接再次调用以保证去重。

所有 moderation 调用的拒绝值遵循 `CommonError`：`{ status, code, msg }`。`status` 为错误类型，`code` 为数字错误码（如 403 权限不足、429 限流、504 超时），`msg` 为错误描述。批量失败项的 `error` 也是这个对象。

单次拒绝值同时是 `Error` 实例，`JSON.stringify(error)` 仍返回上述三个字段；未捕获时，控制台也会保留这三个字段。有效处罚重复提交会返回 409；在后台解除 IP 或设备封禁后，关联脚本记录会同步为已解除，可用新的请求 ID 重新处罚。旧请求 ID 重试仍只返回原回执。

```js
try {
    await world.moderation.banPlayer(playerEntity.player, { reason: '违规', durationSeconds: 600 });
} catch (error) {
    console.log(error.status, error.code, error.msg);
}
// 例如：{ status: 'MODERATION_ACTION_FORBIDDEN', code: 41305, msg: '授权不允许此操作' }
```

如果封禁已生效、目标已离线，重试可能提示玩家已离线。此时在后台复核处罚，不要换一个请求 ID 反复封禁。

每次调用都会重新检查地图组授权的权限、处罚范围和有效期。地图每分钟最多 20 次调用，单个授权每分钟最多 60 次，最多同时等待 8 个请求。授权最长 360 天，有限时长的单次封禁最多 7 天，不能超过授权上限；服主可选择允许永久封禁。

封禁会断开目标玩家；本地图的其他房间通过轮询同步，默认间隔约 10 秒。重新进入时会先检查处罚。身份服务不可用时，新进入的连接会被拒绝；已在房间里的玩家不会因为一次轮询失败被全部踢出。

脚本只能解除同一授权、同一地图创建的处罚，不能解除人工创建的全服封禁。如果管理员后来修改了全服账号处罚，旧脚本也不能覆盖这次人工决定。

脚本可通过 `revokeBan` 解除当前授权创建的处罚；全服账号和 IP / 设备封禁仍在对应后台页面管理。撤销地图授权只停止后续调用，不会自动解除已有处罚。地图授权界面不签发供脚本保存的 Key，也不要求脚本指纹或更新后重新授权。

## 设备封禁与批量调用

`world.moderation.banCurrentDevice(player, options)` 使用认证连接中的浏览器设备身份，脚本不能读取或指定设备标识。它与 IP 封禁共享 `identity-bans.manage` 权限。地图范围拦截同一设备的其他账号，全服范围也撤销该设备的登录会话。管理身份使用中的设备受到保护。

设备身份依赖浏览器设备凭据，并非硬件序列号。更换浏览器或清除凭据可能产生新身份。

`banPlayer`、`banCurrentIP` 和 `banCurrentDevice` 均支持单个 `GamePlayer` 或 `GamePlayer` 数组。单个返回封禁回执，数组返回逐项结果 `{ index, success, ban? , error? }`，顺序与输入一致。批量最多 100 项，仍受原有频率限制；被限流等失败项会明确返回错误，不回滚已成功的处罚。共享 IP 或设备的重复目标也会报告重复处罚。

```js
const results = await world.moderation.banCurrentDevice(
    world.querySelectorAll('player').map((entity) => entity.player),
    {
        reason: '违规设备',
        durationSeconds: 0,
        requestId: 'device-batch-001',
    },
);
for (const result of results) {
    if (result.success === true) {
        console.log(result.index, result.ban.id);
    } else {
        console.log(result.index, result.error);
    }
}
```

永久处罚仍须服主明确允许。批量 `requestId` 最长 72 字符，内部按数组下标派生逐项请求 ID；重试必须复用同一 ID、参数和玩家顺序。`revokeBan` 可用成功项的 `ban.id` 撤销处罚。

## 查询处罚记录与详情

服主须在「地图授权」的创建或编辑界面单独勾选「查询处罚记录与详情」(`moderation.view`)。原有授权不会自动获得这项权限；封禁权限也不会隐含授予查询权限。取消权限、撤销或到期后，后续查询立即被拒绝。

```js
const page = await world.moderation.listBans({
    player: playerEntity.player, // 可省略，省略时查询本图发起的全部处罚
    kind: 'account', // 可省略，也支持 ip、device
    status: 'all', // 可省略，也支持 active、expired、revoked
    page: 1,
    pageSize: 20,
});
const detail = await world.moderation.getBan(banId);
```

`listBans` 返回 `{ items, total, page, pageSize }`，按创建时间从新到旧排列，每页最多 50 条。记录包含处罚 ID、账号 ID、类型、原因、创建时间、到期时间、解除时间、状态和剩余秒数；永久有效处罚的剩余秒数为 `null`，已过期或已解除为 `0`。

查询限定为当前地图发起的处罚，包括历史授权创建的记录，以及由本图发起的全服处罚。不会读取其他地图或后台人工创建的处罚，也不返回 IP、设备标识或管理员身份。玩家筛选接受当前在线玩家的 `GamePlayer` 组件；离线玩家的记录仍可从不带玩家筛选的列表或处罚 ID 查询。详情不存在或属于其他地图时返回 `null`。

地图授权选择框按地图组 ID 去重，不区分创作端和游玩端。旧版若同一地图组分别存在两端授权，升级时保留最后设置的一份；旧记录仍可在授权列表查看。创建、编辑、撤销后，两端统一使用当前授权。运行实例凭证仍独立验证地图、实例和运行模式。

## 安全记录

授权管理与脚本调用共用 `script-moderation-audit.ts` 写入审计。授权变更记录请求来源 IP、操作者和地图组；脚本查询、处罚、幂等重放和业务拒绝均记录地图、运行实例、调用方法、目标、结果与请求 ID。封禁记录保存原因、类型、范围、时长与处罚 ID；查询保存结果数量或单条处罚摘要，不复制整批查询结果、设备哈希或实例凭证。

安全记录中的 IP 是 API 请求来源 IP（脚本调用通常为游戏运行实例的内网 IP），封禁目标 IP 独立记录。历史记录缺失的 IP 显示 `—`。

`apps/game/scripts/simulate-moderation-audit.ts` 用真实 `ModerationScript → ModerationHost → HTTP API` 调用链验证查询、封禁、处罚查询、解除、幂等重放和撤销后拒绝。脚本只允许 `127.0.0.1` 的 `moderation_dev_<数字>` 数据库和 `http://127.0.0.1:3134` 服务；创建独立测试地图及玩家，最后解除处罚、撤销授权，保留安全记录供页面检查。

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

`world.moderation.` 会提示可用方法，调用时会提示参数类型，填写选项时会提示 `reason`、`durationSeconds` 和可选 `requestId`。把鼠标放到方法或字段上可以查看说明。声明只用于开发提示，不会给地图增加管理权限。

管理接口的类型以 `internals/schema/api/js/moderation.ts` 为准，SDK 的对应类型由构建自动同步，不需要手动维护两份。

### 服务更新

管理界面和运行时请求都使用 `@box/apis` 生成的 OpenAPI 客户端。浏览器的授权配置接口只接受服主会话，并沿用后台的来源与 CSRF 校验。

运行时接口是 `/api/player-internal/script-moderation` 和 `/api/player-internal/map-admission`，使用独立的 `Moderation` 实例凭证，不再接受玩家身份的 Bearer。凭证绑定地图 ID、运行实例与 edit/play 模式，五分钟过期，由父启动器每分钟刷新。签发密钥 `BOX_MODERATION_SIGNING_SECRET` 不传给游戏子进程，凭证文件以 0600 权限存放在临时目录，不进入地图、网页、日志或导出包。

桌面启动器会自动生成并保留这个密钥，不需要额外填写。手动 Compose 部署需要在私有 `.env` 中配置随机签发密钥，并一起更新 Player Service、Creator/Play 和服务管理器。不要把密钥放进登录门户。

接口拒绝浏览器来源、Cookie、过期或伪造凭证，且校验请求地图与凭证范围。反向代理仍应禁止公网访问 `/api/player-internal/`，不要把 CORS、地址隐藏或代码混淆当作鉴权。这项设计不防御服主机器或可信父启动器被攻破。

永久地图 ID、玩家账号与连接 IP 都由引擎填写，沙箱请求无法覆盖。授权变更、处罚结果和成功操作审计在同一数据库事务内提交；写入审计失败时，处罚会回滚。

玩家管理前端会随 Player Service 镜像构建。修改脚本 API、协议或 Game Server 时，还需要重建 Creator / Play 镜像；只改后台页面或 Player Service 业务时可单独重建玩家服务，流程见[构建与分发](./release-and-distribution.md#本地增量测试包)。首次使用会自动迁移地图授权、地图信息登记与地图封禁表；旧版账号授权继续保留原身份限制。“允许登录管理后台”开关已移除，账号登录只受启用/停用状态控制。

相关代码：`apps/game/server/script-moderation-{store,service}.ts` 管理授权和处罚，`services/game-server/src/moderation/` 负责可信引擎与脚本之间的调用，`apps/player-admin/src/pages/access/script-moderation-page.tsx` 是服主授权界面。

回归测试：`apps/game/scripts/check-script-moderation.ts` 只接受本机的 `moderation_test` 数据库和同名 schema，测试时会创建账号，必须使用一次性测试数据库。脚本桥接测试在 Game Server 下运行 `node -r @swc-node/register scripts/regression-script-moderation.ts`。

### 地图管理业务错误码

`code` 为稳定的业务错误码，与 HTTP 状态码独立。单次调用拒绝的 Error 和批量失败项均使用 `{ status, code, msg }`。按 `code` 或 `status` 判断原因，不要匹配 `msg`。

| status                                             | code  |
| -------------------------------------------------- | ----- |
| `MODERATION_PARAMS_INVALID`                        | 41000 |
| `MODERATION_OPTIONS_INVALID`                       | 41001 |
| `MODERATION_TARGET_INVALID`                        | 41002 |
| `MODERATION_PAYLOAD_TOO_LARGE`                     | 41003 |
| `MODERATION_BATCH_TOO_LARGE`                       | 41004 |
| `MODERATION_REQUEST_ID_INVALID`                    | 41005 |
| `MODERATION_REASON_INVALID`                        | 41006 |
| `MODERATION_DURATION_INVALID`                      | 41007 |
| `MODERATION_BAN_ID_INVALID`                        | 41008 |
| `MODERATION_QUERY_INVALID`                         | 41009 |
| `MODERATION_ACTION_INVALID`                        | 41010 |
| `MODERATION_IP_INVALID`                            | 41011 |
| `MODERATION_DEVICE_UNAVAILABLE`                    | 41012 |
| `MODERATION_METHOD_NOT_ALLOWED`                    | 41013 |
| `MODERATION_AUTH_REQUIRED`                         | 41100 |
| `MODERATION_FORBIDDEN`                             | 41300 |
| `MODERATION_MAP_MISMATCH`                          | 41301 |
| `MODERATION_GRANT_INVALID`                         | 41302 |
| `MODERATION_LEGACY_GRANT_INVALID`                  | 41303 |
| `MODERATION_QUERY_FORBIDDEN`                       | 41304 |
| `MODERATION_ACTION_FORBIDDEN`                      | 41305 |
| `MODERATION_BAN_ACCESS_DENIED`                     | 41306 |
| `MODERATION_DURATION_LIMIT_EXCEEDED`               | 41307 |
| `MODERATION_ADMIN_PROTECTED`                       | 41308 |
| `MODERATION_DEVICE_PROTECTED`                      | 41309 |
| `MODERATION_SERVER_BAN_FORBIDDEN`                  | 41310 |
| `MODERATION_GRANT_REQUIRED`（未授权）              | 41311 |
| `MODERATION_GRANT_EXPIRED`（授权过期）             | 41312 |
| `MODERATION_GRANT_REVOKED`（授权撤销）             | 41313 |
| `MODERATION_PERMANENT_FORBIDDEN`（不允许永久封禁） | 41314 |
| `MODERATION_NOT_FOUND`                             | 41400 |
| `MODERATION_PLAYER_OFFLINE`                        | 41401 |
| `MODERATION_PLAYER_NOT_FOUND`                      | 41402 |
| `MODERATION_CONFLICT`                              | 41900 |
| `MODERATION_REQUEST_ID_CONFLICT`                   | 41901 |
| `MODERATION_BAN_ALREADY_EXISTS`                    | 41902 |
| `MODERATION_ACCOUNT_ALREADY_PUNISHED`              | 41903 |
| `MODERATION_BAN_CHANGED`                           | 41904 |
| `MODERATION_RATE_LIMITED`                          | 42900 |
| `MODERATION_RESPONSE_INVALID`                      | 45002 |
| `MODERATION_INTERNAL_ERROR`                        | 45000 |
| `MODERATION_UNAVAILABLE`                           | 45003 |
| `MODERATION_RUNTIME_DISABLED`                      | 45004 |
| `MODERATION_RATE_LIMIT_UNAVAILABLE`                | 45005 |
| `MODERATION_TIMEOUT`                               | 45006 |

`durationSeconds` 必须传数字：`0` 表示永久；字符串 `'0'` 返回 `MODERATION_DURATION_INVALID`（41007）。未获永久封禁授权时，数字 `0` 返回 `MODERATION_PERMANENT_FORBIDDEN`（41314）。

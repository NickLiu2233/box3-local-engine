# 可配置的移动与攻击校验

`anticheat-policy.js` 提供两项函数，只合并进服务端脚本：

- `installMapAnticheat(world, options)`：安装移动、攻击规则，返回记录器、移动豁免和清理方法。
- `validateAnticheatRay(world, action, spec)`：用服务端起点重新射线查询，复核候选实体/方块及遮挡。

引擎增加 `action.target`：通过服务端实体表解析 `targetId`，不存在时为 `undefined`。这仍然是候选目标，不是命中证明。需要更新并重启使用本次源码的引擎；旧容器的 API 不一定包含这个字段。

## 合并到正常地图

先合并 `anticheat-policy.js`，再安装一次。下面展示配置形状；`movementLimitsFor` 和 `validateWeaponOrBuild` 必须接入本图服务端玩法。

```js
const mapAnticheat = installMapAnticheat(world, {
  observeOnly: true,
  historySize: 64,
  spawnGraceTicks: 48,
  entities: world.querySelectorAll('player'),
  movement: {
    limits(entity, event) {
      return movementLimitsFor(entity, event)
    },
  },
  action: {
    originRadius: serverCameraOriginTolerance,
    maxPresses: 1,
    cooldownTicks: { action0: weaponCooldownTicks, action1: buildCooldownTicks },
    validate(event, action, entity) {
      return validateWeaponOrBuild(event, action, entity)
    },
  },
})
```

`movement.limits` 同步返回以下非负有限数，使用引擎物理单位：

| 字段                    | 含义                                   |
| ----------------------- | -------------------------------------- |
| positionError           | 客户端候选位置与当前服务端位置的容差   |
| horizontalSpeed         | 本玩法允许的水平速度上限，含已校准容差 |
| riseSpeed               | 上升速度上限                           |
| fallSpeed               | 下落速度绝对值上限                     |
| horizontalVelocityError | 候选速度与当前服务端速度的水平修正容差 |
| verticalVelocityError   | 候选速度与当前服务端速度的竖直修正容差 |

不要直接把 `elapsedMs` 当物理 dt：它是收包间隔。长时间不发包不会自动扩大位置容差。不要因为前一次候选已放行就提高速度上限，否则小幅连续增速会逐步扩大许可。

合法击退、服务器传送和载具需要服务端逻辑调整 profile 或短暂调用：

```js
// 仅在服务器已验证并执行的技能/冲量逻辑中调用。
mapAnticheat.exemptMovement(entity.player, 3, '服务器击退同步')
```

豁免按服务端脚本时钟到期，只影响该模块的移动规则，不影响攻击、身份、归属、重复包检查。不能把客户端自报的技能/豁免直接传入。

## 攻击和命中

`action.validate(event, action, entity)` 必须同步返回 `null`（通过）或拒绝原因字符串。可以先检查武器、材料、权限，再调用：

```js
return validateAnticheatRay(world, action, {
  origin: serverEyePosition(entity),
  maxDistance: serverWeaponRange(entity.player),
  ignoreSelector: '#' + entity.id,
})
```

起点由服务端相机/武器逻辑计算，不采用客户端的起点作为权威起点。方向归一化后使用服务端距离上限查询；候选实体必须与服务端首个命中实体相同，候选方块必须与服务端命中坐标相同。没有声明命中（负射线距离）的空击允许通过，地图结算仍须使用经过验证的服务端结果。

该辅助函数使用当前世界快照，不提供历史回放补偿。正常延迟、第三人称相机、实体移动、方块边界都需要校准，复杂武器可以提供自己的 validator。自动瞄准和合法速率内的自动操作不能仅凭这些阈值保证识别。

冷却按玩家和按钮独立保存，以服务端脚本时钟计算；松开不消耗冷却，客户端 tick 不改变冷却。整包通过本模块才提交新的冷却，拒绝包不会延长下一次正常操作的等待时间。其他监听器仍可能拒绝同一包，因此这里的“通过”不代表最终伤害已结算。

## 记录、清理和范围

默认 `observeOnly: true`，记录异常并记分，校准后设为 `false` 才执行拒绝。配置错误、异步 validator 或监听器异常仍触发引擎的失败拒绝。

`movementTracker` 和 `actionTracker` 保存各自有界历史。可选同步 `onDecision({player,kind,reason,rejected})` 用于统计；不要在里面等待数据库。执行拒绝时，引擎宿主通过有界队列写入本地审计日志，包含认证账号 ID、玩家名、拒绝原因和服务端 tick；此模块不自动封禁。详见 [本地审计](../anticheat-release.md)。

`dispose()` 取消订阅并清理记录；再次安装前先 dispose。玩家离开时清理实体和冷却状态。不要同时安装多份默认规则。

本轮新增目标解析接口和可配置规则，未给所有地图设置固定全局阈值。透视所需的信息下发控制，以及正常地图物理/网络现场校准仍需按玩法接入。

## 验证

以下是 2026-10-06 的历史记录，不是当前源码的完整验收。原始 JSON 未随源码分发；四方向数据来自隔离基线，不替代正式玩法默认重力、多玩家和延迟验收。

以下浏览器证据是清理前的历史结果；手动测试脚本和地图测试入口现已移除。日志审计新增后须以发行候选验证报告为准。

- 51 项反作弊测试通过，包括目标解析、跨包冷却、速度修正、禁止逐包抬高速度许可、正常预测跳跃/下落、合法冲量 profile、传送豁免、遮挡和方块命中。
- 自动化规则 fixture 在 `isolated-vm` 中执行通过，验证了速度拒绝、正常首击、重复包冷却拒绝和只读报告。
- 原 AirJump、AntiKnockBack、攻击事件构造方法隔离执行，新规则拒绝先前放行的指定样本，见 `../anticheat-policy-evidence-20261006.json`。飞行使用按源码参数构造的速度样本。
- 2026-10-06 已更新桌面运行的 Creator、Play 镜像，两者均 healthy，HTTP 健康检查返回 200，并核实容器包含新版目标解析逻辑。
- Creator 专用地图 本机专用测试地图 已保存并运行增强脚本。真实 Chrome 面板十项全部通过：正常修正、正常攻击放行，八项异常按预期拒绝，跨包首击放行、第二击拒绝。原始报告见 浏览器验证证据（本机历史附件，未随源码提供）。
- 同图真实行走实测通过：前进 4.92 格、后退 5.25 格、左移 5.35 格、右移 4.63 格，均无新增移动拒绝；行走后瞬移测试仍被拦截。见 真实行走验证证据（本机历史附件，未随源码提供）。
- 本次浏览器十项测试在 Creator 执行；Play 已更新引擎，已发布地图的脚本不会随镜像更新自动替换。普通地图仍需接入并校准玩法规则。

部署镜像 ID：

- Creator：`sha256:4a17f25884141c389bcfe9033908d2a8ffdbac37023ae0bcb67163e1cacdfa15`
- Play：`sha256:1f35d1ca5b98d1959f26ba9d235c4045ccd54e3eb1e67b5145ad05755a3a9345`

本次保留原镜像标签 `box-local-engine-creator:anticheat-before-20261006` 和 `box-local-engine-play:anticheat-before-20261006`，地图与数据挂载保留。

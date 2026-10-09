# 给地图写自己的反作弊规则

不同地图的“正常行为”不一样。飞行、瞬移、连续攻击可能是外挂，也可能就是你的玩法。引擎负责识别真正的发送者、限制数据所有权、把操作送进服务端监听。检测条件由你写，这些工具只帮你管理记录，不自带检测阈值，也不会自动封号。

## 从模板开始

先看[示例索引](examples/README.md)：观察数据和编写规则分别有一份可直接使用的服务端示例。

把 [script-anticheat.js](examples/script-anticheat.js) 合并到地图的**服务端脚本**。不要放进客户端脚本，也不要覆盖原来的玩法代码。

模板默认只观察。`movementRule` 和 `actionRule` 的检查函数都返回 `null`，没有内置速度、距离或攻击频率限制。你可以逐步添加自己的检查：

- 正常：返回 `null`。
- 异常：返回 `{ reason: '你的说明', points: 1, reject: true }`，分值由你决定。
- 默认只记录，不执行拒绝。确认规则适合自己的地图后，再把 `observeOnly` 改成 `false`。

只观察模式不是“出错也一定放行”：监听器抛异常、超时或返回 Promise，仍会触发引擎的失败拒绝。检查函数必须同步执行。

## 创建一份规则记录器

```js
const combat = world.anticheat.createTracker({
  historySize: 32, // 每位玩家保留的最新记录数。
  decayPerTick: 0, // 每个服务端脚本 tick 衰减多少分；0 表示不衰减。
})

world.anticheat.onAction(({ player, actions }) => {
  combat.record(player, {
    pressed: actions.filter((action) => action.pressed).length,
  })
  // 在这里结合自己的玩法和 combat.getHistory(player) 做判断。
})
```

每个 `createTracker()` 都是独立的。移动检查的分数、历史和豁免不会跑到攻击检查里；同一个规则里，各个玩家也互不影响。

| 想做什么                         | 方法                                                                  |
| -------------------------------- | --------------------------------------------------------------------- |
| 留下必要的数据                   | `record(player, data)`                                                |
| 查看当前保留的记录               | `getHistory(player)`                                                  |
| 累计、读取和重置本规则的异常分数 | `addScore(player, amount)`、`getScore(player)`、`resetScore(player)`  |
| 设置和查询临时豁免               | `exempt(player, options)`、`isExempt(player)`、`getExemption(player)` |
| 提前结束豁免                     | `clearExemption(player)`                                              |
| 清空一位玩家的历史、分数、豁免   | `clear(player)`                                                       |
| 清空本规则全部数据               | `clear()`                                                             |

`addScore()` 只是记分，不会拒绝操作、踢人或封号。你可以根据分数决定只记日志，或在当前监听里调用 `context.reject()`。如果还需要账号处罚，单独使用 `world.moderation`，它原有的授权检查不会被记录器绕过。

## 时间和历史怎么用

记录的 `serverTick` 由引擎注入的**服务端脚本时钟**写入，不能给 `record()` 传一个客户端 tick 来替换它。`tracker.serverTick` 来自同一个时钟，不依赖浏览器的 Date。

这是脚本当前的 tick，不保证与某条消息的 `context.serverTick` 完全相同，也不是客户端实际按下按钮的时刻。服务端脚本暂停时，按 tick 计算的衰减和豁免到期也暂停。

历史按记录顺序返回，是独立的只读快照。不要传整个玩家、实体或 `context`，只记录需要的 JSON 字段。以后修改原数据，不会修改已经保存的记录。

容量满时只保留最新记录。因此，`getHistory()` **不能直接当成某个时间窗口内的全部请求数**。高频输入可能把旧记录挤掉；需要精确计数的地图应在自己的服务端规则里维护计数，不能拿截断历史当作完整统计。

## 合法技能的临时豁免

```js
const movement = world.anticheat.createTracker()

// 在服务端已经验证通过的技能逻辑中调用；持续多久由地图决定。
function allowMovementForSkill(player, durationTicks) {
  movement.exempt(player, { ticks: durationTicks, reason: '地图技能' })
}

world.anticheat.onMovement(({ player, context }) => {
  if (movement.isExempt(player)) return
  // 在这里写自己的移动检查。
})
```

`exempt()` 只保存本规则的标记。只有你明确查询并跳过检查，它才会影响你的规则；其他规则仍然照常执行。到期条件是当前服务端脚本 tick 达到 `untilTick`。

它不能跳过身份认证、修改他人数据、重复修正检查，也不能取消另一条规则已经做出的拒绝。不要因为客户端发来 `exempt: true` 就直接给它设置豁免，必须先验证技能、权限和状态。

## 生命周期与资源限制

记录器按服务端 `GamePlayer` 对象保存数据，不按昵称或客户端自报 ID。状态只在当前脚本内存里保存，不写数据库；重新加载服务端入口时会清空，玩家离开后的对象不再使用时可由垃圾回收释放。

每个脚本最多创建 64 个记录器，每位玩家的历史容量为 1～256，默认 32。单条记录最多 16384 个 JSON 字符、2048 个节点、16 层嵌套。这些是内存保护，不是玩法限制；不合法的配置或数据会抛出错误，不会偷偷截断后当作有效证据。分数和豁免只保存当前值，不积累无限列表。

## 客户端能不能调用

不能。客户端用的是独立的 `ClientWorld`，没有 `GameAnticheat` 实例；这些记录器没有新增公网消息或管理接口。

创作编辑器需要显示服务端 DTS，所以接口名称不是秘密。安全依赖服务端执行、真实连接身份和私有消息通道，不依赖隐藏名字。你写在服务端的规则不会因为别人修改自己的浏览器对象就改变。

本工具参考了 NoCheatPlus 的检查、数据和处理分离思路，独立编写，没有复制它的代码或 Minecraft 物理规则。参见 [NoCheatPlus](https://github.com/NoCheatPlus/NoCheatPlus)。

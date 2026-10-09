# 地图反作弊监听

接口只在地图服务端脚本中使用。服主可以检查玩家发送到引擎的消息，并拒绝本次操作，不需要让玩家断线。

需要管理玩家历史、异常分数或合法技能的临时豁免时，可使用可选的 `createTracker()`。见[规则记录器和模板](anticheat-toolkit.md)。它不自带检测或处罚策略。

## 先选你要检查的操作

日常反作弊优先使用分类事件，不用先学习网络协议。

| 接口            | 能直接拿到什么                        | 拒绝会影响什么                   |
| --------------- | ------------------------------------- | -------------------------------- |
| `onMovement`    | 玩家、位置、速度、采样间隔            | 当前位置和速度修正；保留按键输入 |
| `onInput`       | 玩家、跳跃/奔跑/飞行等按钮状态        | 整个移动输入消息                 |
| `onKeyboard`    | 玩家、本次按下和松开的键码            | 本次键盘消息                     |
| `onInteract`    | 玩家、请求交互的候选目标实体          | 本次交互请求                     |
| `onCustomEvent` | 玩家、客户端脚本发送的 JSON 数据      | 本次自定义事件                   |
| `onUIEvent`     | 玩家、自定义 GUI 的事件名和 JSON 数据 | 本次界面事件                     |
| `onMessage`     | 原始协议名、消息名、解码数据副本      | 本次消息；进阶排查使用           |

例如，地图不允许客户端请求飞行：

```js
world.anticheat.onInput(({ buttons, context }) => {
  if (buttons.fly) context.reject()
})
```

自定义事件也不用自己解析字符串：

```js
world.anticheat.onCustomEvent(({ player, data, context }) => {
  // data 不可信，要按你自己地图的事件格式校验。
  if (!isAllowedEvent(player, data)) context.reject()
})
```

`isAllowedEvent` 是自己编写的判断函数。分类事件与通用事件复用同一次消息检查；任何监听器拒绝都生效，不会因为其他监听器没有拒绝就重新放行。分类事件中的 `tick` 仍是客户端上报值，可信的服务器 tick 位于 `context.serverTick`。

分类订阅只检查对应消息，不让无关网络维护和 GUI 回复排队；`onMessage` 才会检查全部游戏消息。

本地引擎没有启用旧平台聊天 WebSocket。通过地图自定义事件实现的聊天、指令会进入 `onCustomEvent`；这里不提供一个实际上接收不到玩家聊天的 `onChat` 接口。

## 点击、攻击和放置

`onInput` 是连续按键状态，不包含每一次点击。`onAction` 提供同一输入消息内的全部主/副操作变化：

```js
world.anticheat.onAction(({ player, actions, serverPosition, context }) => {
  // 示例策略：本图不允许一条消息中重复主操作；不是引擎通用限制。
  const attacks = actions.filter((a) => a.button === 'action0' && a.pressed)
  if (attacks.length > 1) {
    context.reject()
    return
  }
  for (const action of attacks) {
    // origin、targetId、position、distance 都是客户端声明，不是命中证明。
    // 先按本图相机规则校验起点，再调用 world.raycast 重新计算遮挡/命中。
    if (!isAllowedAction(player, action, serverPosition)) {
      context.reject()
      return
    }
  }
})
```

`isAllowedAction` 由服主实现，不是引擎接口。每个 `action` 包含 `button`、`pressed`、客户端 `tick`、`position`、`targetId` 和 `ray`（`origin`、`direction`、`normal`、`voxel`、`distance`）。松开也会进入列表，同一个原始输入同时改变两个操作键时会产生两项。

只检查单条消息的次数，不会拦住拆成多条消息的重复攻击。下面是另一条可直接使用的服务端规则；数值需要按本图武器调整，可与起点、命中检查组合：

```js
const attackIntervalTicks = 4 // 本图规则，不是引擎默认值。
const lastAttack = new WeakMap()
world.anticheat.onAction(({ player, actions, context }) => {
  const attacks = actions.filter((a) => a.button === 'action0' && a.pressed)
  if (!attacks.length) return
  const previous = lastAttack.get(player)
  if (
    attacks.length > 1 ||
    (previous !== undefined && context.serverTick - previous < attackIntervalTicks)
  ) {
    context.reject()
    return
  }
  lastAttack.set(player, context.serverTick)
})
```

这是一条保守的接收频率规则，不保证处理所有延迟补发情况。如果另一条规则也拒绝了该消息，这里仍会记录尝试的 tick。先观察正常玩家数据，再决定是否开启；不要用客户端上报 tick 代替服务器时间。

`serverPosition` 是服务端脚本当前认可的位置快照，不是客户端自报值，也不是输入发生时的历史位置。`context.serverTick` 是可信的服务器 tick；不要用客户端 `tick` 做处罚冷却。数据为只读副本，监听只能同步执行。

`reject()` 阻止整条输入消息，包括其中的移动控制和所有操作变化，保留玩家连接。没有操作变化时不触发回调。订阅后，格式不合法的操作数据会拒绝；这是格式校验，不是距离、频率或武器规则。

引擎不固定攻击距离、冷却、伤害、相机模式或连击数。第三人称、固定相机、远程武器等需要不同规则。射线结果仍是候选数据：没有编写检查规则时，新增接口不会自动识别远程攻击或远程放置。地图的 `onClick` / `onPress` 业务代码也不能无条件信任客户端命中。

监听、订阅和放行/拒绝协议只在服务端与脚本隔离进程之间传输，不注册在玩家连接上；客户端不能关闭监听或提交放行结果。修改自己浏览器的 `world` 或 Hook WebSocket，不会修改服务端的监听器。

## 通用消息

```js
world.anticheat.onMessage(({ player, protocol, message, data, context }) => {
  // protocol、message 由引擎消息表确定，data 是解码后的只读副本。
  // 按自己地图的规则检查，不要把每个带目标玩家的消息都当作作弊。
  if (shouldReject(player, protocol, message, data)) {
    context.reject()
  }
})
```

`shouldReject` 是你自己编写的判断函数，不是引擎 API。可先记录实际消息名称和数据结构，再编写针对当前地图的规则。不要把所有消息都拒绝，否则按键、聊天和网络同步也会被拒绝。

覆盖已认证玩家的移动、按键、交互、自定义事件以及其他已注册游戏协议消息。通过自定义事件发送的地图聊天也包含在内。检查发生在解码之后、对应业务处理函数之前；没有调用 `reject()` 的消息继续按原来的权限校验和玩法逻辑处理。

拒绝只阻止当前消息，不踢人、不封号、不撤销此前已经成功的操作，也不会阻止同一数据包中其他独立消息。引擎身份验证和连接握手不交给地图脚本决定；地图脚本不能修改真实发送者或绕过引擎自己的检查。

不要长期拒绝网络确认、暂停/恢复和同步等维护消息，否则可能触发正常的连接超时。日常规则优先使用分类事件，避免误拦这些维护操作。

`data` 不能修改。密码、令牌、Cookie、设备身份等敏感字段会遮蔽；未经解码的原始二进制只提供长度，不把任意字节当成可信对象。超过 16 KB 或嵌套过深的消息检查数据会被拒绝，不截断后当作正常消息放行。

## 移动修正

```js
world.anticheat.onMovement(({ player, from, to, elapsedMs, context }) => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z)
  // 这是示意阈值，不是适用于所有地图的速度限制。
  // 还需要考虑冲刺、载具、击退和网络延迟等玩法。
  if (distance > 100) context.reject()
  // 首条 elapsedMs 为 0，不能计算速度，但也不能直接放过越界或大幅位移。
})
```

- `player` 是服务器从真实连接识别的玩家。
- `from` 是服务器认可的位置；`to` 是客户端上报、尚未应用的候选位置，不能当作可信事实。
- `elapsedMs` 是服务器处理采样的时间间隔，不使用客户端时间，也不是物理模拟时长。启用通用消息检查时，也可能包含排队造成的处理延迟。
- `context` 包含输入 tick、服务器 tick、edit/play 模式和 `reject()`。

拒绝移动修正会丢弃当前待处理的位置和速度修正，但保留该移动包的按键和视角输入。不是冻结角色：角色仍按服务器物理和已接受的输入运动，客户端会随正常状态同步得到服务器位置。服务端脚本直接修改状态或传送不经过客户端消息监听。

如果先被 `onMessage` 拒绝，该消息不会再进入移动业务处理，也不会触发对应 `onMovement`。

客户端只可修正自身角色；其他玩家、共享物体和非玩家实体的修正都会在底层丢弃，不依赖是否订阅。共享物体仍由服务器碰撞和服务端脚本驱动。推箱子、载具等玩法需要在多人场景验证同步手感。

同一条输入中重复出现自身角色的候选修正时，这些修正会丢弃，普通按键保留；不能用第一条通过检查、另一条偷偷应用。等待批准时只保存唯一被检查候选的独立快照。这个检查是消息一致性和所有权限制，不是固定的速度、距离或玩法规则。

## 监听器生命周期

各个接口都返回与其他事件一致的 token：

```js
const listener = world.anticheat.onMessage((event) => {})
listener.cancel()
listener.resume()
console.log(listener.active())
```

监听器必须同步执行，不能等待数据库或网络请求。`context.reject()` 只在当前回调期间有效，不能保存起来延迟拒绝。多个监听器中任意一个拒绝，当前操作就被拒绝；监听器异常、返回 Promise 或超过主机 200 ms 决策时限也拒绝。

不订阅时保留普通处理路径。通用消息检查最多全图 128 个待处理请求、每位玩家 16 个，移动修正最多全图 64 个、每位玩家 1 个；超出上限丢弃新请求的对应操作。同一玩家通用消息保持接收顺序。

曾经启用的检查在脚本退出、暂停或重载期间保持拒绝受保护操作，不因为监听进程暂时消失就放行。网络维护仍可继续。新的可信脚本完成初始化后恢复；如果服主主动换成不订阅反作弊的新脚本，也会在初始化完成后解除旧防护。旧请求和旧脚本的决策不会复用。

这是给服主的判断工具，不是自动证明“玩家作弊”。客户端预测和采样延迟可能有误差。建议先记录和调试，再启用拒绝；不要仅凭一次异常自动封号。

## 升级与安全边界

WebSocket 现在需要由会话接口签发的连接凭证，仅知道连接 ID 不能追加通道冒用其他玩家。凭证在升级请求头中发送，不写入连接 URL，也不交给地图脚本；它不依赖浏览器 HTTPS 专用 API。

服务端、创作端和游玩端前端要一起更新，旧游戏页面需刷新才能携带新凭证。公网 HTTP 不加密，无法防止网络中的第三方窃取凭证，因此不能把 HTTP 兼容理解为防中间人攻击。

不要使用客户端传来的 `userId`、`role`、按键或界面值作为权限证明，始终使用真实 `player` 并执行自己的权限校验。遮蔽后的敏感字段不能用作验证密码或令牌的依据。透视、客户端画面修改等不产生异常服务端请求的行为，不会因为接入这些监听器就自动被识别。

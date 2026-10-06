# 真实运行环境验证：2026-10-06

状态：**Creator 与独立 Play 的正常/异常输入、服务端拒绝和内存记录验证通过。测试规则启动时序误报已修正，Creator 三次独立启动及后续异常拒绝通过。持久化审计日志未实现/验证，不能泛称抵挡所有外挂。**

## 环境与范围

- 当前 Creator 容器镜像：`sha256:e3cb1f085636d9ef3dd3f55313b5860c2c45c50c8c2e67fbac419ed434ea4cc2`。
- 当前 Play 容器镜像：`sha256:0865f9dfda6b0c4120998c35678b46721501e6ff88378f7c66490c4e3e0b5ec6`。
- 两者均与本轮完成构建并校验的镜像匹配，容器健康。
- 新建专用地图“反作弊真实验证-20261006”，编辑地址 `/e/project-muw6e2cy`。
- 未修改原有三个地图或其脚本，未运行用户原地图中的永久 IP 封禁代码。
- 测试脚本只记录和拒绝当前输入，不使用 world.moderation，不处罚账号、IP 或设备。

## 已观察到的事实

1. 实际浏览器页面能访问自己的游戏客户端连接；核心对象没有 `anticheat` 属性。
2. 实际客户端的 Mu 协议表中没有 `messageDecision` 私有决策消息。
3. 服务端监听已触发 `context.reject()`，创作端控制台显示 `[AC-LIVE-20261006]` 的 movement-rejected 记录及累计分数。
4. 这些是现场运行结果，不是先前 39 项本地回归测试的重述。

## 上一轮中断原因（历史记录）

第一版测试初始化改变了玩家位置和物理配置，在主动构造恶意输入前就出现大量位置差异拒绝。它们只能证明拒绝和控制台记录链路有响应，**不能视为正确识别作弊的证据**。

已在专用测试脚本中去掉初始化传送和玩家物理改动，并加入仅供初始同步使用的短暂规则豁免。继续检查时还观察到玩家位置在 x/z=64 且持续下落，需要进一步分离地图出生点、物理和客户端预测因素；尚未完成正常输入对照。

尝试读取只读的测试报告时，Mac 锁屏使浏览器操作被阻止。因此本轮尚未证明以下项目：

- 正常移动和单次操作稳定放行。
- 主动发送的大幅自身位置修正被拒绝且有对应记录。
- 其他实体修正、重复自身修正不改变服务端状态。
- 堆叠操作、伪造射线起点被测试地图规则拒绝。
- 缺失或伪造会话凭证不能追加实际地图的 WebSocket 通道。
- 记录器历史与控制台记录能准确对应测试用例。
- 游玩模式下重复上述验证。

## 记录的位置

目前观察到的是创作端服务端控制台输出。规则记录器本身为当前脚本的内存数据，不是后台数据库日志；本轮没有证明持久化保存或后台日志页面可查。不能把这几种记录混为一谈。

## 继续测试

解锁 Mac 后，在该专用地图继续。先读出服务端报告并建立正常物理/输入基线，再逐项发送测试消息；每个用例同时检查响应、服务器最终状态和记录。不执行第三方外挂，不触碰真实玩家或原地图。

专用脚本参考：[anticheat-live-test-server.js](examples/anticheat-live-test-server.js)。其中阈值仅属于此验证地图，不是引擎默认限制。


## 续测结果：2026-10-06 13:40（Asia/Shanghai）

### Creator：真实客户端 → 运行容器 → 脚本规则

专用地图初始化增加 `world.gravity=0`，保留正常出生位置。浏览器 Monaco 修改后读取内容确认，并通过实际编辑器启动地图。未修改引擎业务代码。

| 用例 | 现场证据 | 结论 |
| --- | --- | --- |
| 正常位置修正 | movements 从 104 增至 616，movementRejected 保持 1；位置 `(64,140,64)`，最近历史 distance=0/rejected=false | 稳定阶段放行 |
| 正常单次 action0 | actions=1/actionRejected=0；历史 presses=1/rejected=false | 放行 |
| 自身位置 x 增加 1000 | movementRejected 从 1 到 2；历史 serverTick=61800、distance=1000、rejected=true；位置仍 `(64,140,64)`；控制台 score=2 | 规则拒绝并记录 |
| 同一包三次 action0 | actions=2/actionRejected=1；历史 serverTick=62456、presses=3、rejected=true；控制台 score=3 | 规则拒绝并记录 |
| 单次操作射线起点 x=1064 | actions=3/actionRejected=2；历史 serverTick=62698、presses=1、rejected=true；控制台 score=4 | 规则拒绝并记录 |
| 两条自身 ID=4 修正，第二条 x=2064 | duplicatePackets=1；duplicate-observed/count=2；位置未变，movementRejected 保持 2 | 重复包确实到达，未改变位置 |
| 哨兵 ID=13 修正 x=3064 | 只发送哨兵修正；后续报告 sentinel 仍 `(20,4,16)`，玩家仍 `(64,140,64)` | 未改变哨兵状态 |
| 缺失/伪造会话凭证 | 两者 opened=true、messages=0、closed=true、code=1006；合法连接仍运行 | 握手后拒绝进入游戏通道 |

最终读出的服务端报告：movements=2252、movementRejected=2、actions=3、actionRejected=2、duplicatePackets=1、score=4。

**启动仍有一次 distance≈9.853 的拒绝，未将它算作作弊拦截。** 稳定阶段正常修正无新增拒绝。本次并未测试有地形、重力、跳跃和传送的正常玩法，不能据此认可该示例阈值适用于实际地图。

控制台包含上一轮历史，单纯过滤日志可能混入旧记录；本次结论同时使用新运行实例的计数差、服务端 tick 和最终位置，不以旧日志累计值作证据。

### Play：独立部署实际游玩

只将专用测试地图导出为 `v0.0.1-ac-test`（约 10.35 MB）并通过本机 Play 管理 API 导入，未替换其他地图。下载文件：`/Users/viyrs/Downloads/anticheat-live-test-20261006.boxplay`。

入口：`http://127.0.0.1:3121/p/project-muw6e2cy`。运行容器日志确认该地图启动并创建玩家；客户端 self=6、哨兵 ID=5、gravity=0，私有 messageDecision 接口未出现在客户端协议表。

发送自身 x=1064、重复自身第二条 x=2064、哨兵 x=3064 后，客户端接收同步的位置仍为玩家 `(64,140,64)`、哨兵 `(20,4,16)`，连接仍运行。该证据是客户端同步观察，**没有读取 Play 的服务端报告，不能等同于逐项确认服务端拒绝决定/记录**。

Play 缺失/伪造凭证均 opened=true、messages=0、closed=true、code=1006，合法连接仍运行。

WebSocket 服务端在 connection 回调中检查凭证，因此 `open` 事件本身不是认证成功；本次以是否收到通道分配消息、是否随即终止作为判据。第一版探测在 open 时主动关闭，已弃用其结果，并用不主动提前关闭的探测重新验证。

### 自动检查与恢复

- `services/game-server`: `npm run check:anticheat`，真实隔离回归和 39/39 测试通过。
- `apps/game`: `npm run test:script-types`，编辑器、独立 SDK 和客户端隔离检查通过。
- 两个页面的正常 input 发送函数均已恢复；临时探测连接均已关闭。
- 未封禁账号/IP/设备，未修改原地图，未提交 Git。

### 尚未覆盖

Play 下单次/堆叠/伪造射线操作的拒绝决定及历史读取；真实另一玩家的状态隔离；正常重力、移动、跳跃和传送的误报检查；断线重连和脚本重载的现场验证；持久化反作弊日志及后台查询。当前 tracker 是脚本内存历史，Creator 控制台记录不能当作数据库审计日志。


## 第二次续测：Play 服务端证据与启动时序

本节更新前文的“尚未验证”状态。独立 Play 使用专用测试地图 `v0.0.2-ac-test`，增加只读 `ac-live-report` 回复和真实 `world.onPress` 落地计数；通过既有 remoteChannel 收到报告，不增加引擎私有决策接口。只读报告包含请求 nonce、规则计数、服务端位置、分数、历史和最多 16 条证据。仅用于专用验证地图。

### Play：七项断言通过

| 报告 nonce | 服务端证据 | 结果 |
| --- | --- | --- |
| play-baseline | movements=745、movementRejected=0、score=0、presses=0 | 正常基线通过 |
| play-normal-action | actions=1、actionRejected=0、实际 presses=1；tick=2643 历史 rejected=false | 正常单次操作进入玩法 |
| play-stacked-action | actions=2、actionRejected=1、score=1；tick=2901 历史 presses=3/rejected=true；实际 presses 仍为 1 | 堆叠操作未进入玩法 |
| play-forged-ray | actions=3、actionRejected=2、score=2；实际 presses 仍为 1，历史 rejected=true | 伪造射线未进入玩法 |
| play-teleport | movementRejected=1、score=3；tick=3374，from.x=64/to.x=1064；服务端位置 x=64 | 异常位置拒绝且状态未变 |
| play-duplicate | duplicatePackets=1；玩家 x=64、movementRejected 保持 1 | 重复修正没有改变位置 |
| play-foreign | 哨兵服务端位置 `(20,4,16)`、玩家 `(64,140,64)`；实际 presses=1、score=3 | 哨兵伪造修正未生效 |

浏览器对七份服务端报告进行了失败即抛错的断言，输出 `AC_PLAY_ASSERTIONS_PASSED`。原始报告已保存：

- [Play 服务端原始证据](anticheat-play-evidence-20261006.json)

这里证实的是脚本内存历史与拒绝决定，以及拒绝后的业务事件/服务端位置。JSON 文件是现场验证保存的证据，不代表引擎已经实现持久化审计日志。

### Creator 启动误报定位与修正

原规则仅在 `onPlayerJoin` 回调中设置 48 tick 豁免。复现时服务端在回调前收到旧预测状态的移动修正：tick=75791，from.y=-19.245393753051758、to.y=-28.4140625、exempt=false，导致正常启动 score=1。随后玩家才同步到出生位置 `(64,140,64)`。

测试规则增加 `!liveActors.has(event.player)` 初始化检查，在测试脚本完成玩家登记前不套用地图自定义移动阈值；仍保留原 48 tick 同步豁免。未更改引擎所有权、重复 ID 或会话凭证防护。

测试脚本放入独立函数作用域，避免调试/重载期间顶层变量重复声明。编辑器修改之后确认脚本实际运行；快速将停止和启动 RPC 串在一起时出现未进入新脚本的中间状态，相关查询错误已排除，不计入通过结果。最终使用独立停止、启动、查询操作并确认 `replica.running=true`。

最终三个独立启动报告分别为 movements=85、57、74，movementRejected 均为 0，玩家分数均为 0、已登记玩家均为 1。随后同一规则收到 1000 格异常修正，movementRejected=1、score=1、服务端 x 仍为 64。原始报告：

- [三轮启动及异常拒绝证据](anticheat-startup-evidence-20261006.json)
- [最终专用测试脚本](examples/anticheat-live-test-server.js)

### 结束状态与验证边界

两个客户端 input 发送钩子和报告队列观测钩子均已恢复。原地图和玩家处罚状态未修改；专用 Creator 地图保留最终测试脚本，Play 保留已完整验证的 v0.0.2-ac-test。业务引擎代码及运行镜像本轮未修改。

最终脚本 `node --check` 和 `git diff --check` 通过。上一轮 39 项反作弊回归、真实脚本隔离与编辑器/SDK 类型检查已通过，本轮只修改测试脚本和现场报告。

仍未覆盖正常重力/地形/跳跃/传送的误报检查、真实第二玩家的状态隔离，以及持久化审计日志和管理端检索。三轮启动结果仅证明此测试规则的初始化对照通过。

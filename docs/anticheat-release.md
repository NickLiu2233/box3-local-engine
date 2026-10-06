# 本地引擎反作弊发行说明

引擎提供服务端判定、执行前拒绝、可信身份记录和本地审计。地图需要接入自己的玩法规则；没有监听器时保留原有移动、跳跃、飞行和消息行为。不会安装测试阈值、改变重力或自动处罚玩家。

## 接入与记录

使用 `world.anticheat` 的同步事件监听器，通过 `event.context.reject('weapon-cooldown')` 拒绝操作。原因最多 128 字符；不要把密码、凭证、聊天内容放进原因。无参数的旧 `reject()` 仍兼容。目标实体由服务器注册表解析，候选目标仍需按服务端射线和玩法权限复核。

[可配置规则](examples/anticheat-policy.md) 默认只观察，校准后才开启拒绝。服务器传送、击退、载具和技能必须接入对应的合法移动上限或短期豁免。监听器不得 `await`；超时、重启和异常会拒绝当前待检操作，但不应据此处罚玩家。

Creator 和 Play 宿主自动将拒绝记录写入挂载的 `apps/local-engine/data/anticheat-audit/`。子目录为 `BOX_DATA_STORAGE_NAMESPACE` 的 SHA-256 前 24 位；不同命名空间分开保存。非本地宿主只有显式配置 `BOX_ANTICHEAT_AUDIT_PATH` 才写文件。

管理员在服务端读取 JSONL，按 `userId` 查找账号。每条记录包含认证连接的账号 ID、显示名、玩家实体 ID、时间、服务端 tick、事件类别与拒绝原因。移动记录另含候选位置和速度；消息记录仅含协议和消息名称，不保存原始消息、IP、token 或会话凭证。文件不通过公共网页接口提供。

- `suspected-anomaly`：地图规则拒绝的疑似异常，不能直接当作已证实作弊。
- `inspection-failure`：检查超时、容量不足、脚本不可用、重启、监听器异常或身份连接变化。

队列最多 128 条，每个宿主每秒最多接收 20 条审计记录。单个文件最多 2 MiB，每个命名空间保留最近 16 个文件，通常最多约 32 MiB。多个活动宿主共享命名空间时，旧文件可能被轮转删除。省略记录的数量和写入失败会输出宿主警告。记录异步写入，强制终止或磁盘故障可能丢失尚未写出的尾部；需要长期归档时由管理员另行采集日志。

## 验证与清理

自动化检查：`npm --prefix services/game-server run check:anticheat`。覆盖私有判定协议、身份伪造、消息顺序、移动归属、脚本重启、冷却、射线校验、记录轮转和写入失败。真实 `isolated-vm` 回归 fixture 保留在 `services/game-server/scripts/fixtures/`。

本地引擎回归：`npm --prefix apps/local-engine test`。编辑器与 SDK 类型检查：`npm --prefix apps/game run test:script-types`。

2026-10-06 手动面板、完整演示、演示生成器及一次性参考探针已删除。专用地图 `project-muw6e2cy` 的测试入口已清空并保存，其他脚本与地图内容保留；浏览器面板和输入钩子已卸载，确认重力为默认 `-0.18`。原处罚地图未操作。

历史浏览器证据保留在 `docs/anticheat-*-evidence-20261006.json`。四方向行走证据来自此前隔离物理基线；默认重力下协议对照通过，但尚未完成正式玩法的延迟、多人、武器伤害和正常飞行现场验收。这些历史结果不能代表所有地图或所有外挂均可识别。

新版 Creator 的真实消息对照中，正常消息进入业务回调，调用 `reject('release-test-rejection')` 的消息没有进入。两条消息均自报伪造身份，但服务端监听器识别为认证账号 `1`，持久审计记录显示 `fish`、账号 `1` 和对应地图 ID。临时规则仅安装在专用地图运行时内存中，随后销毁并重新创建运行时，确认状态为 `ready`、在线人数为零。合成拒绝记录已定向删除；检查超时与脚本重启等基础设施记录保留。详见 [本次发行验证证据](anticheat-release-evidence-20261006.json)。

## 发行范围

本次不修改 CLI 与场景控制轮询。新增能力进入本地引擎宿主、私有脚本协议和脚本 API。

工作区仍有未提交修改，当前生成物必须标为本地发行候选。仓库的正式离线发行命令要求干净、已提交的源码；禁止将带 `local-dirty` 元数据的候选包冒充正式公开发行包。发布前还需为正式地图完成正常玩法与多人验收，并在相应平台构建、验证最终发行包。

已生成并通过标准离线包验证的 macOS ARM64 候选：
`apps/local-engine/dist/release-candidates/anticheat-20261006/BOX-Local-Engine-0.3.0-anticheat-rc-20261006-macos-arm64.zip`。
包内包含六个服务的 ARM64 离线镜像。SHA-256：`2383918e18863be88ac1d03a916d73c8525b7c6abcf822ad47a94f6da8b5ddce`。
应用目前为 ad-hoc 签名，尚未完成 Developer ID 签名和 Apple 公证；不能作为已经公证的正式 macOS 发行包交付。

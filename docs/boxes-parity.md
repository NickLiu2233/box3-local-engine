# 与 boxes 的引擎核心对齐基线

本文记录 Local Engine 与 `boxes` 的代码边界和维护规则。目标不是复制 BOX 在线平台，而是让
同一个工程在本地 Creator、Play 和 game-server 中保持相同的引擎行为。

## 审计基线

本次审计使用本地 `boxes` 工作树，对以下真实运行链路逐层比较，而不是按页面数量判断：

```text
工程/发布快照
  → build-system 迁移与 prebake
  → game-server 初始化权威状态与脚本
  → Session / MuDB 协议
  → Creator 或 Play 浏览器引擎
  → 本地内容、身份和数据存储
```

对比结论：

- `packages/schema` 没有语义差异；
- `internals/build-system` 的源码差异仅为包名从 `@box/*` 改成 `@box-local/*`，核心迁移、
  bake、prebake 和资源任务保持同源；
- Creator/Play 的渲染、物理、动画、实体、UI 和脚本主流程保留 `boxes` 实现；
- game-server 的语义差异集中在本地内容、身份、存储、运行时调度和 VOXA 素材；
- RabbitMQ、神策、Nacos、CI 镜像注册和云容器回收已从本地发行路径移除。

这意味着当前优先工作是守住同源基线和完善 adapter 的回归测试，而不是继续迁入平台模块。

## 必须保持同源的核心

以下代码除明确修复上游引擎缺陷外，不应加入本地业务判断：

| 核心 | 保持一致的内容 |
| --- | --- |
| 工程 schema | RDA、hot/cold project、权限、实体、模型、皮肤、UI 和脚本格式 |
| build-system | 历史工程迁移、group project、bake/prebake、资源处理和 hash 计算 |
| MuDB | 协议 schema、握手、客户端/服务端验证条件和状态同步 |
| game-server | tick、实体、物理、脚本、玩家、动画、声音、UI 和存储调用语义 |
| 浏览器引擎 | 渲染、输入、动画、资源预取、Creator/Play 生命周期 |
| script-api | `world`、`entity`、`player`、`storage` 等脚本可见接口 |

本地修复如果改变协议，客户端和 game-server 必须成对修改并验证。禁止只让一端“兼容一下”。

## Local Engine 的合法 seam

平台能力只能在以下 seam 替换，不能散落进引擎各模块：

| Seam | boxes adapter | Local Engine adapter |
| --- | --- | --- |
| 内容寻址 | IPFS / OSS / 内容服务 | 工程 `blobs/`、发布只读内容、VOXA 本地回退 |
| 地图生命周期 | 容器平台和后端调度 | `launcher`、Creator 双运行时、多地图 Play library |
| Session 与身份 | BOX 账号和后端 cookie | 独立 Player Service、强制注册/登录、签名运行时身份 |
| 数据空间 | 在线 Java/PG 服务 | 本地文件或服主 PostgreSQL，保持旧双表语义 |
| 热缓存 | 平台 Redis | 可选 Redis adapter，本地持久缓存回退 |
| 模型和皮肤目录 | 云端模型 API | VOXA Local 与当前 Project 素材 |
| 项目管理 | 云端工程/发布 API | 本地工程目录、不可变 release、导入导出和备份 |

每个 seam 的外部 interface 应尽量小：调用方只知道“取内容”“创建 Session”“访问数据空间”
或“启动作品”，不应该知道文件路径、PostgreSQL 表名或 Player Service 内部路由。

## 已对齐的本地能力

| 能力 | 当前状态 |
| --- | --- |
| 地形、实体、脚本、UI、图片、音频、模型和皮肤 | 使用同一工程 schema 和内容 hash |
| Creator 与 Play | 使用同一浏览器引擎和 game-server 主流程 |
| 多工程 Creator | 每个项目独立编辑/预览运行时和项目作用域 |
| 多地图 Play | 按地图 ID 启动独立运行时，发布数据只读挂载 |
| Project 模型和皮肤 | 只包含当前工程引用；发布后完全从工程 blob 读取 |
| 默认皮肤 | 按项目 `CONTAINER_NAME` 隔离；未设置时不读取其他工程默认值 |
| 数据空间 | 本地文件和 PostgreSQL 两个 adapter；保持 boxes 的旧表兼容 |
| 玩家身份 | 独立 Player Service，同时供 Creator 预览和 Play 使用 |
| Redis | 可选 Session/限流/预烘焙热缓存；失败时本地回退 |
| 导入、导出、发布 | `.boxproject` 与只读游玩产物分离，带完整性校验和进度 |
| 快照与备份 | 工程快照恢复、定时 `.boxproject` 备份和运行状态聚合 |

## 明确不迁入

- RabbitMQ 付费消息、商城和订单链路；
- 神策或其他平台分析 SDK（已删除，不提供兼容层）；
- BOX 账号、OAuth、实名认证、防沉迷、支付、评论、推荐和运营后台；
- Nacos、Kubernetes、内部服务发现、CI 镜像注册和云容器回收；
- 云端协作编辑、平台资产所有权和内容审核；
- 已停运域名或未知私有接口的运行时回退；
- 为“未来也许多节点”预先增加的 MQ 或编排层。

这些模块即使存在于 `boxes`，也不属于引擎兼容性。迁入会扩大配置面、引入不可满足的线上
假设，并破坏离线和单机可用性。

`internals/env` 中仍可能保留上游未被本地产物调用的 Nacos/K8s schema，用于维持 workspace
源码兼容；本地 `METHOD=local` 路径不读取这些配置。不要因为字符串仍存在就把相应服务加入
Compose，是否进入实际入口和镜像运行路径才是判断标准。

## 变更审查规则

每次引擎变更按以下顺序判断：

1. `boxes` 是否已经有相同实现？有则优先移植最小差异；
2. 是否属于上表某个本地 seam？不是则默认不加入；
3. 是否改变工程 schema、prebake 产物或 MuDB 协议？若是，必须说明兼容策略；
4. 是否能通过一个现有 adapter 完成？能则不要在多个调用点增加条件；
5. 是否引入新的必需服务、端口、密钥或公网依赖？若是，必须先有真实部署需求；
6. 是否有回归测试覆盖“未配置”“服务失败”“多项目/多地图隔离”和“发布后只读”路径？

不要直接用整目录覆盖更新 `boxes`。正确做法是以固定 commit 为基线，对上述核心目录做语义
diff，忽略包名前缀，然后逐个审查非前缀差异。

## 发布前对齐检查

```bash
pnpm check
pnpm check:edit-session
pnpm --filter @box-local/game-server check:default-skin-scope
pnpm --filter @box-local/voxa check:default-skin-scope
docker compose config
```

还应使用两个不同项目验证：

1. 项目 A 设置默认皮肤，项目 B 不设置；B 停止态与运行态外观必须一致；
2. 两个项目同时打开，模型、皮肤、运行时和数据空间不能串项目；
3. 保存、刷新、运行、发布后项目模型只出现一次；
4. 发布包在没有 Creator 和 VOXA 的 Play 环境中仍能完整显示资源；
5. 脚本错误显示在控制台，但不应使网页无提示白屏；
6. Redis 关闭时单机仍可运行，PostgreSQL 关闭时 Player Service 明确报告不健康；
7. 强制下线能在配置轮询时间内断开对应玩家。

## 后续优先级

当前没有需要从 `boxes` 继续迁入的核心模块。后续只接受三类工作：

1. 经过复现的引擎兼容缺陷；
2. 本地 adapter 的正确性、安全性和可观察性；
3. 上游 `boxes` 核心改动的定期、可审计同步。

对象存储、多实例或新的基础设施只有出现真实第二个 adapter 和部署需求后再设计，不作为
“功能补全”预先加入。

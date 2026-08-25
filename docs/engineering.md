# 工程开发规范

本文档约束 Local Engine 仓库的开发、验证和发布流程。目标是在保持 boxes 引擎兼容性的前提下，让本地控制层可以独立维护、测试和分发。

## 运行环境

- Node.js：`22.17.x`，本机可通过 `.node-version` 或 `.nvmrc` 自动选择。
- pnpm：`10.12.1`，以根目录 `packageManager` 字段为准。
- 正式数据存储：PostgreSQL；Redis 是可选缓存，不得成为正确性的前提。
- Docker/Compose：用于 Creator、Play、Player Service、VOXA 和 Migrator 的分发运行。

安装依赖前建议执行：

```bash
corepack enable
pnpm install --frozen-lockfile
```

## 模块边界

仓库分为两类代码，修改策略不同：

1. 本地控制层：`apps/local-engine`、`apps/migrator`、根目录 `scripts`、Compose 和分发配置。这里可以按本项目需求演进，但应把进程生命周期、项目管理、存储和导入导出保持为小接口、深实现的模块。
2. boxes 兼容层：`apps/game`、`apps/voxa`、`services/game-server`、`internals`、`packages`。这里承载引擎协议和继承实现。修改前必须先对照 boxes，禁止仅为格式统一进行大面积改写。

地图身份、地图组身份、玩家身份、资源 hash、引擎消息顺序和存储命名都属于兼容接口。改变这些接口必须补充迁移说明和回归测试。

## 代码风格

- UTF-8、LF、2 空格缩进、文件末尾保留换行。
- JavaScript/TypeScript 使用单引号、不使用分号、保留尾随逗号，单行建议不超过 100 字符。
- 新增代码不得通过关闭整个规则集来绕过检查；确有兼容原因时，将例外限制到具体文件并写明原因。
- 不在运行时代码中散落环境变量解析。配置应在模块入口完成校验，再以明确参数传入实现。
- 不新增仅有一个实现的抽象层。远程 Player Service 等真实 seam 应同时具有生产 adapter 和测试 adapter。

`pnpm format` 只覆盖本地控制层及工程文件；从 boxes 同步的兼容层被刻意排除，避免生成无意义的大 diff。兼容层仍通过各自 ESLint 配置约束新增修改。

## 验证命令

提交前至少执行：

```bash
pnpm verify
```

它依次执行：

- `pnpm format:check`：本地控制层和工程文件格式检查；
- `pnpm lint`：本地控制层、Game 和 VOXA 静态检查；
- `pnpm typecheck`：当前可稳定通过的 Migrator 严格类型检查；
- `pnpm test`：本地控制层、地图组、存储隔离、分发包、迁移器和 Teleport 回归。

Game 与 VOXA 的全量 TypeScript 历史基线尚未清零，因此暂不作为发布硬门禁。新增或重构模块应提供自己的窄 `tsconfig`，逐步扩大可稳定通过的类型检查范围，而不是降低根级规则。

涉及容器或发布流程时，还应执行：

```bash
docker compose config --quiet
pnpm audit --prod --audit-level critical
pnpm build:creator
pnpm build:play
pnpm build:voxa
```

CI 会对 Critical 生产依赖漏洞和 Creator/Play 两套 Compose 模板执行硬门禁。High 及以下风险仍需在每次发布前查看完整审计；门禁通过不代表可以忽略 [生产依赖安全审计](./security-audit.md) 中的剩余项。

## 测试原则

- 在模块接口处测试可观察行为，不依赖实现细节。
- PostgreSQL/文件系统等本地可替换依赖使用隔离测试数据；测试不得连接生产实例。
- Player Service 等自有远程模块通过 adapter 注入，测试使用内存 adapter。
- 每次修改地图组、导入导出、存储 namespace、身份或 Teleport 行为，都必须增加对应回归。

## 数据与生成文件

以下内容不得提交：本地 `.env`、用户项目、运行时缓存、上传素材、数据库数据、构建输出和迁移器缓存。可分发参数只写入 `.env.example`，且不得放入真实密钥。

生成的声明、构建产物或 boxes 同步代码应注明来源和生成命令。不要手工修改一个会在下次构建中被覆盖的文件。

## 提交与评审

1. 保持一次提交只解决一个可解释的问题。
2. 先说明改变了哪个模块接口，再说明实现细节。
3. 引擎兼容层改动必须附 boxes 对照位置或说明本地化差异。
4. UI 改动需同时检查亮色、暗色、窄屏、空状态、加载状态和错误状态。
5. 发布相关改动需验证 Creator 与 Play 分发包，而不只验证开发模式。

## 当前工程审计与后续优先级

### 发布前必须确认

1. **授权范围**：源仓库的 npm 元数据为 `UNLICENSED`，不授予源代码开源许可；面向用户的发行包适用 `distribution/LICENSE.txt` 中的非商业本地部署许可。公开、商业、二次开发或再分发前必须由权利人确认引擎、素材和第三方依赖的授权范围；不能把技术构建成功等同于具备分发许可。
2. **跨架构镜像验收**：在实际要分发的 `linux/amd64` 与 `linux/arm64` 环境分别完成 Creator、Play、Player Service、VOXA 的启动、健康检查、地图导入、编辑、发布和游玩 smoke test。
3. **依赖与供应链**：当前生产依赖审计已降至 0 个 Critical、1 个 High、12 个 Moderate 和 6 个 Low，详见 [生产依赖安全审计](./security-audit.md)。剩余 High 来自 boxes 历史数值构建链中的 `static-eval@0.2.4`，没有可安全直接覆盖的补丁路径；公开分发前需完成可触达性确认或对该构建链做兼容替换。另有 `@swc-node/core` 要求 `@swc/core >= 1.13.3`、仓库仍固定 `1.4.13` 的 peer 依赖不一致，后续升级必须与 boxes 对照验证，不能只按版本号批量更新。
4. **恢复演练**：验证 PostgreSQL、项目目录、Play 包和 Player Service 数据的备份及整机恢复。文档存在不代表恢复可用，发布前必须在空机器上实际恢复一次。
5. **生产安全配置**：轮换示例密钥，强制固定 `PERMISSION_TOKEN_SECRET` 和管理 key；公网部署通过受信反向代理提供 HTTPS，并验证真实 IP、限流、封禁和强制下线链路。

### 高优先级工程优化

1. `project-manager.js` 已超过 2000 行，应以现有外部接口为 seam，将归档导入导出、快照、项目元数据和地图组编排分别收进深模块；调用方不应学习 tar、目录布局和 ID 规则。
2. `apps/migrator/lib/export-project.ts` 已超过 1600 行，应把“远端图遍历”“资源下载”“内容重写”“本地包生成”拆成可独立测试的内部阶段，对外仍保留一个迁移任务接口。
3. `launcher.js` 应将端口分配、子进程生命周期、空闲回收和运行时配置整理到现有 lifecycle seam，避免 Creator/Play/Teleport 各自复制状态判断。
4. Game 暂存 202 条 ESLint 告警，VOXA 暂存 51 条告警。优先清理 hooks、无障碍和已弃用 React 生命周期，再逐项将规则从 warning 提升为 error。
5. 为 Game、VOXA 和 game-server 建立窄范围、可稳定通过的 TypeScript 配置，逐步扩大 `pnpm typecheck`；不要直接用当前全量历史错误作为 CI 门禁，也不要通过关闭 strict 来伪造通过。
6. CI 增加容器构建矩阵、Compose 启动 smoke test、健康端点检查、SBOM/许可证清单生成和镜像 SHA-256 校验。当前 `pnpm verify` 负责源码与行为回归，不替代真实容器验收。

### 与 boxes 的有意差异

- 保留 boxes 的引擎协议、资源结构、地图组和脚本行为，但不迁移 Rush、平台分析、平台专用接口、RabbitMQ 或 Kubernetes。
- 本项目以 Compose 和可配置资源上限服务单机/小规模私有部署；如未来出现多节点调度的真实需求，再引入对应 seam，而不是预先复制平台基础设施。
- 身份由独立 Player Service 管理，宿主可以自建登录界面；Play 与 Creator 只消费可信身份，不重新实现账号系统。
- 正式数据存储只支持 PostgreSQL，Redis 仅作可选缓存；正确性不得依赖缓存命中。

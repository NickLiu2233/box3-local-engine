# BOX3 本地引擎：ChatGPT 接手上下文

> 截至 2026-10-22，根据仓库文件、当前可见聊天摘要和会话检查点整理。标注“已验证”的内容来自代码、文档或检查；“历史观测”可能已过时；“待确认”表示没有足够证据。仓库当前代码和新日志优先于本文。

## 1. 项目概览

BOX3 本地引擎是可自托管的网页多人 3D/体素游戏创作与运行平台。创作者使用 Creator（ARENA）编辑地图、场景和脚本，使用 VOXA 制作模型、皮肤与动画；服主部署服务，玩家通过浏览器或桌面启动器游玩。主要能力包括地图组、地图发布/导入、Play 游玩、玩家身份权限、部署管理及 `.boxproject` / `.boxplay` 作品迁移。依据：`README.md`。

**技术栈（已验证）**：TypeScript/JavaScript、Node.js、Next.js、React；Rush + pnpm monorepo；OpenAPI 位于 `internals/apis`；PostgreSQL 保存身份、权限和脚本持久数据；Redis 可选；Docker Compose 部署；Tauri/Rust 桌面部署管理器；Electron 玩家启动器。

**环境**：`rush.json` 要求 Node.js `>=22.17.0 <23.0.0`，pnpm `10.12.1`，Rush `5.156.0`。对话中用户曾说电脑为 Windows、Node.js `24.18.1`；历史调试记录则为 Node.js `22.17.0`。当前实际版本待确认。Windows 开发要求 Docker Desktop、虚拟化和 WSL 2。参见 `docs/developer-guide.md`。

## 2. 项目结构

| 路径 | 用途 |
| --- | --- |
| `apps/game/` | Creator、Play、Player Service 页面/API、浏览器游戏引擎及代理 |
| `apps/local-engine/` | 本地工程/地图组/快照/导入导出和各地图 runtime 生命周期 |
| `services/game-server/` | 权威游戏状态、体素、会话、脚本、storage、保存、反作弊 |
| `apps/voxa/` | 模型、皮肤、动画编辑器 |
| `apps/player-admin/`、`apps/player-auth-portal/` | 玩家管理和登录门户 |
| `apps/deployment-manager/`、`apps/manager-core/`、`apps/server-manager-rust/` | 桌面/Web 部署管理器及共享规则 |
| `apps/player-launcher/` | Electron 玩家客户端 |
| `internals/apis/`、`internals/schema/` | OpenAPI 契约/生成客户端、场景协议 |
| `packages/` | 内容服务器、实时客户端、脚本 API、UI 和共享库 |
| `distribution/` | 发行与部署模板 |
| `docs/` | 架构、开发、测试、代码规范、创作和发布说明 |
| `.local-data/` | 本机开发地图、模型、备份、导出和缓存；用户数据，不应纳入 Git |

根 `package.json` 将主要命令委托给 Rush；工作区项目由 `rush.json` 登记。

## 3. 架构与数据流

浏览器先访问 `apps/game` 同源页面、资源、会话和 WebSocket。`apps/local-engine` 管理可编辑 project、play-world、地图组并启动每地图 `services/game-server` 子进程；网页服务代理到内部 runtime。Creator 编辑模式写入可编辑工程；Play 加载已导入的不可变发布快照，不自动展示 Creator 工程。Player Service 与 PostgreSQL 提供身份权限；Redis 可选。浏览器不应直接访问内部 runtime 控制端口。

开发默认地址（`docs/developer-guide.md`）：Creator `3127`、Play `3121`、VOXA `3123`、Player Service `3124`、登录门户 `3125`、管理后台 `8000`。Local Engine 代码默认 Edit runtime manager `9967`、子进程端口从 `11000` 起；Play manager `9966`、子进程从 `12000` 起（`apps/local-engine/src/launcher.js`），环境变量可能覆盖。

`.local-data/apps/local-engine/` 存放工程和发布数据，模型常见于 `.local-data/apps/voxa/data/`；数据库独立存储。project ID、永久地图 ID、publicId 和发布 world 是不同标识/对象。作品包不能代替 PostgreSQL 备份；迁移优先使用 `.boxproject` / `.boxplay`，不要直接编辑 hash blob、状态文件或数据库。

**扩容流程（当前代码）**：`apps/game/pages/projects/index.tsx` 等待 Edit runtime → `apps/game/pages/api/local-projects/[id]/expand.ts` 调用内部校验、保存、快照及扩容 API → `services/game-server/src/createServer.ts` → `services/game-server/src/voxel/voxel-expansion.ts`。实现保留旧体素于原点，新区域为零；各轴必须整数、不得缩小，宽长 16–1024、高 16–128、尺寸为 16 的倍数，总体素不超过 `1024×128×1024`。该目标为代码上限，不代表机器内存/启动时间可承受。当前流程先 runtime 校验，再保存并建 `before-expansion` 快照，最后扩容。

## 4. 开发约定

项目规范见 `CONTRIBUTING.md`、`docs/code-style.md`、`docs/testing.md`：

- 文件/目录英文 `kebab-case`；函数/变量 `camelCase`；类型/类 `PascalCase`；常量 `UPPER_SNAKE_CASE`。
- 自有 JS/TS/CSS/Less 四空格、分号、单引号、多行尾逗号；JSON 两空格，Rust 使用 rustfmt。
- 优先具名导出、清晰错误、校验外部输入；避免空 catch、伪成功、循环依赖及跨应用直接导入源码。
- API 变更更新 OpenAPI 并重新生成客户端；不要手改生成文件。行为变化须有针对性测试，命令/流程变化同步文档。
- 不提交密钥、`.env`、玩家数据、地图、本机数据或无关构建产物；不要清理/reset 用户工作树。
- 仓库内未发现 `AGENTS.md`；以上项目文档是主要约定来源。

根目录常用命令：`npm run install:all`、`npm run dev:creator:infra`、`npm run verify`、`npm run typecheck`、`npm run test`、`npm run check`、`node scripts/check-documentation.js`。`verify` 只做基础格式/语法/风格检查，不替代类型检查和业务测试。针对性测试命令见 `docs/testing.md`。

## 5. 已实现功能和当前进度

### 已提交的历史进展

- `e3294c8c`：地图扩容实现及 TypeScript 修复。
- `b5f3e81a`：Player Admin 开发模式 public path 修复。

分支此前被推送到个人私有远程的说法来自历史摘要；当前远程为 `personal`，本次上传前已确认分支 `nickliu2233-expand-existing-voxel-map` 的 HEAD 与 `personal` 跟踪引用在 `b5f3e81a`。

### 尚未提交、与本次地图/runtime 故障相关的源代码改动

- `apps/game/server/map-info.ts` / `map-info.test.ts`：Creator edit 新地图不要求已存在于 Play 发布库；Play 仍按发布世界验证。
- `apps/game/server/player-service-client.ts`：Player Service 身份请求上限 35 秒。
- `apps/game/next.config.js`、`packages/content-server/src/data.ts`：本地 runtime 资源请求与代理上限延长到 31 分钟；并发回归补充超时断言。
- `packages/content-server/src/file-system-store-node.ts`、`apps/local-engine/src/project-manager.js`、`services/game-server/src/edit/replica/replica-server.ts`：修复写 blob 前建目录、新工程初始化错误清理，以及保存异常重新抛出。
- `apps/game/shared/local-runtime-timeouts.ts`：扩容 UI 等待和扩容 API 请求统一到 31 分钟，以覆盖 Local Engine 默认 30 分钟启动等待。
- `apps/game/server/local-project-runtime.ts`、测试及 `apps/game/pages/api/local-projects/[id].ts`：删除地图前停止 Edit/Play runtime；主地图删除时覆盖地图组成员；停止失败则不继续删除，避免静默留下进程。
- `apps/game/server/project-editor-dialog-ui.test.ts`：补充等待时间和删除 runtime 顺序检查。
- `packages/content-server/package.json`、`packages/content-server/scripts/regression-file-system-store.js`：增加文件存储回归入口。
- `CHATGPT_CONTEXT.md`：本项目迁移上下文文档。

相关的 `packages/content-server/build/` 存在生成产物变化；本次上传只选取相关源码/文档，不上传大批其他构建生成物。

**最近验证（已验证）**：Game 两个 Jest 文件通过，共 11 项；`apps/game` 的 `tsc --noEmit -p apps/game/tsconfig.json` 通过；相关文件 `git diff --check` 通过；文档检查通过（77 个 Markdown 文件）。未跑完整 monorepo 测试，也未在用户运行中的地图上实际验收。

## 6. 已知问题与尝试结果

以下故障来自聊天摘要/检查点，非当前复现结果：

| 现象 | 已知处理/结论 | 仍需确认 |
| --- | --- | --- |
| 新建地图报 `Play world does not exist` | Creator/Play 模式区分已改 | Windows 本地是否已运行新代码 |
| 保存 ENOENT，找不到 `source/blobs/<hash>` | 写前创建父目录；保存失败向上抛；初始化失败清理 | 历史损坏工程如何恢复 |
| 资源请求 `/runtime/edit/.../block/<hash>` code 0 | 当时 blob 存在但 runtime 子端口未监听；提高请求上限 | runtime 为什么未 ready，需最新子进程日志 |
| 删除地图后 URL 仍是旧 `/e/<id>` | 打开的标签页不会因删除自动改 URL | runtime 清理新逻辑需验证 |
| 扩容超时、卡在 loading | UI/API 10 分钟短于 runtime 默认 30 分钟，现调至 31 分钟 | 启动卡死根因仍未知；延时不等于修复卡死 |
| PowerShell 执行构建提示 `'rm' 不是内部或外部命令` | npm 脚本用 POSIX `rm -rf`；历史上改用 Git Bash 执行 | 仓库是否已有原生 Windows shell 兼容方案 |
| Docker Desktop 提示更新 WSL | Windows Docker Desktop 使用 WSL 2 backend | WSL 是否已更新 |

历史曾观察到 `.local-data/apps/local-engine/projects` 下若干目录缺 `project.json`，但仍有 blob/状态且子 runtime 在运行；包括 `project-mvkdkbsn`、`project-mvkbq7wv` 等。该状态可能已变且不能据此操作：不得擅自删数据、恢复快照或杀进程。

当前工作树有大量与本任务无关的修改/生成产物。提交应只选确认相关文件；不允许 `git add .`、reset、clean 或批量覆盖。

## 7. 下一步及验收标准

1. 用户本机重启本地 Creator/运行时，确认采用本次代码，提供最新脱敏 runtime stdout/stderr 和项目 ID，定位卡在资源准备、工程读取、健康检查、数据库或其他阶段。
2. 在可恢复的测试地图上先做小幅扩容：原体素仍位于原点，新区域为空；保存/重启后数据一致；运行时运行中应拒绝扩容；非法尺寸不应消耗快照。
3. 对最大尺寸单独评估内存和启动能力，勿在唯一原始地图上直接尝试。
4. 验证删除子地图、删除主地图组、Edit/Play runtime 就绪/启动中/服务不可达的场景。成功删除前运行时应停止；失败时给出明确错误且项目数据保留。
5. 重跑针对性 Jest、Game TypeScript 和 diff 检查；如果改动共享存储/运行时，再执行对应 Content Server/Local Engine 测试。
6. 只提交任务相关文件；用户未要求时不创建 PR。

## 8. 重要讨论结论与 ChatGPT 接手

用户目标是从 `256×64×256` 扩至 `1024×128×1024` 并迁移旧地图内容；设计选择为**原点保留旧内容，新增加区域为空**，不拉伸或重采样地形。用户在 Windows 本机测试，曾遇到 Docker/WSL、Windows shell 命令不兼容、Creator 地图打开、保存、资源超时、旧路由和 runtime loading 问题。此前可见摘要列出两个已推送提交，但没有本次远程状态或 PR 的证据。

当前可用聊天历史有长段被摘要/省略（提示注明省略 48 条消息），因此不能确认被隐藏消息中的所有操作、决定、VM 细节或用户数据。历史 TypeScript 检查曾报告剩余 179 个诊断，但本次 Game TypeScript 检查通过；旧数字不代表现状。

**接手建议先读**：本文件、`README.md`、`docs/architecture.md`、`docs/developer-guide.md`、`docs/testing.md`、`docs/code-style.md`、`CONTRIBUTING.md`；之后依据问题读扩容上述四个文件，以及 `apps/local-engine/src/edit-library.js`、`play-library.js`、`launcher.js`。先执行 `git status --short --branch`，再编辑。

**人工补充/确认**：电脑当前 Node/Docker/WSL 版本和状态；最新脱敏 runtime 日志及对应地图；地图是否有可恢复备份；私有远程推送/后续提交许可。不要把 Token、密码、API Key、私钥或真实连接串写进本文。

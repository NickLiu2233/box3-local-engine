# BOX3 Engine 开发者与协作手册

本文是本仓库协作者的统一入口：从首次拉取代码，到本地运行、修改、测试、评审和发布。它描述的是 Local Engine 的协作方式；服主部署请看[安装、部署与使用手册](./installation-and-operations.md)。完整文档分类见[文档导航](./README.md)。

## 先用十分钟熟悉项目

1. 阅读[系统架构与源码入口](./architecture.md)，先确认需求属于网页、运行时、项目管理、VOXA、认证、启动器还是发行。
2. 阅读对应模块的 `README.md` 与附近测试，不要从根目录开始盲目搜索。
3. 执行 `corepack enable && pnpm install --frozen-lockfile`，再运行 `pnpm check` 验证基础环境。
4. 先写清楚要保持的用户可见行为和失败提示；涉及地图、blob、协议或 boxes 行为时，先阅读[对齐基线](./boxes-parity.md)。

常见入口：网页在 `apps/game/`；项目和运行时编排在 `apps/local-engine/src/`；权威运行时在 `services/game-server/src/`；模型编辑器在 `apps/voxa/`；图形化启动器在 `apps/deployment-manager/`。

如果需求来自用户截图或日志，先按“用户看到的页面/服务 → 请求 API → 控制层 → 运行时/数据”回溯，不要从 `packages/` 开始泛搜。以下三个问题可以快速缩小范围：

1. 这是一份可编辑工程、已发布快照，还是 Play 安装包？
2. 这是地图自身数据还是地图组共享资源？
3. 这是网页显示问题、容器编排问题，还是 game-server 的权威状态问题？

## 1. 项目定位与协作原则

BOX3 Engine 是一个本地优先的 BOX 兼容引擎发行版。它保留地图、资源、脚本、地图组和运行时协议，使用本地项目目录、Docker Compose、独立 Player Service 和可选远程 PostgreSQL/Redis 替代云平台依赖。

协作时优先遵守以下原则：

1. **先保持兼容，再做优化。** 地图 UUID、地图组、资源 hash、脚本 API、引擎消息顺序和表命名都属于外部兼容接口；改动必须有回归测试和迁移说明。
2. **小接口、深实现。** 将归档、存储、运行时生命周期等复杂细节收敛在模块内；调用方不应依赖目录结构、Docker 命令或 blob 格式。
3. **默认安全。** Creator 与 VOXA 只允许本机或可信局域网；Play 与玩家服务才可以按配置对外开放。
4. **数据不可猜测。** 生产数据使用 PostgreSQL；Redis 只是可选缓存。任何正确性都不能依赖缓存命中或本机临时文件。
5. **不覆盖他人改动。** 先查看 `git status` 和相关 diff；只改本任务涉及的文件，不使用会丢失未提交内容的 Git 命令。

## 2. 环境准备

| 工具           | 要求                            | 用途                                          |
| -------------- | ------------------------------- | --------------------------------------------- |
| Node.js        | `22.17.x`，见 `.node-version`   | 前端、控制层与工具脚本                        |
| pnpm           | `10.12.1`，见根 `package.json`  | workspace 依赖与任务编排                      |
| Docker Compose | Docker Desktop 或 Docker Engine | 容器构建、Creator、Play、VOXA、Player Service |
| Rust           | 安装稳定版工具链                | 图形化启动器（Tauri）后端                     |
| 平台原生工具链 | macOS Xcode CLT / Windows MSVC  | 构建对应桌面启动器                            |

首次安装：

```bash
corepack enable
pnpm install --frozen-lockfile
```

不要把本机 `.env`、项目、模型、数据库数据、Docker 卷、日志、备份和构建产物提交到仓库。模板使用 `.env.docker.example` 或各目录的 `.env.example`，模板中也不能写入真实凭据。

## 3. 仓库地图

| 路径                       | 职责                                                     | 修改注意事项                                     |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| `apps/local-engine/`       | 本地控制层、项目管理、运行时调度、导入导出、镜像与离线包 | 本项目主要演进区域；保持模块边界清晰             |
| `apps/game/`               | Creator/Play Web 界面与客户端引擎                        | 与 boxes 行为对齐，避免无目的大范围格式化        |
| `services/game-server/`    | 引擎服务端、存储、玩家、运行时                           | 协议、存储 namespace、生命周期改动必须回归       |
| `apps/voxa/`               | 本地模型、皮肤与动画编辑器                               | 注意项目级资源与本地作品库的边界                 |
| `apps/migrator/`           | 内部云端工程迁移工具，不进入用户发行包                   | 导入失败必须保留可理解的错误与可恢复状态         |
| `apps/deployment-manager/` | BOX3 Engine 图形化启动器（Vite + Tauri）                 | 用户配置只写 `.env`，派生配置只写 `.runtime.env` |
| `packages/`、`internals/`  | 共享引擎、协议和构建能力                                 | 视为兼容层，修改前先对照 boxes                   |
| `scripts/`                 | 根级校验、发行与回归脚本                                 | 新功能应在这里或所属模块增加可自动执行的检查     |
| `docker-compose.yml`       | 服务拓扑、容器安全限制、端口和卷                         | 任何变更都需 `docker compose config --quiet`     |
| `docs/`                    | 面向服主和协作者的文档                                   | 交付行为变化必须同步更新                         |

## 4. 本地开发方式

### Web 与引擎

常用入口：

```bash
# Creator 开发运行时
pnpm dev

# 独立开发 VOXA 或内部迁移工具
pnpm --filter @box-local/voxa dev
pnpm --filter @box-local/migrator dev

# 生产形态的容器启动
pnpm creator
pnpm play
pnpm player-service
pnpm player-auth-portal
pnpm voxa
```

Creator 和 Play 的运行方式不同：Creator 读取可编辑工程，Play 只读取已发布的只读游玩包。不要用 Play 修改源工程，也不要把 Creator 的 `source/` 目录直接当成 Play 地图目录。

### Play 前端 UI 预览模式

修改游玩端首页、地图卡片、账户菜单或服主管理界面时，优先启动 UI 预览服务查看效果，不需要重建 Docker 镜像或桌面启动器。该模式只用于前端视觉与交互验收，默认地址为 `http://127.0.0.1:3124/`。

```bash
cd apps/game
set -a && . ../../.env && set +a
BOX_LOCAL_CONFIG_PATH="$PWD/../local-engine/config/local.config.json" \
BOX_DEPLOYMENT_MODE=play \
BOX_UI_PREVIEW=true \
node -r ts-node/register server/dev-server/index.ts --http --port 3124
```

`BOX_LOCAL_CONFIG_PATH` 不能省略：它提供本地开发所需的基础配置；缺失时 Next 配置可能因服务地址为空而无法启动。端口可替换为未占用端口。若开发缓存损坏并提示缺少 `.next/server/webpack-runtime.js`，先停止该服务，再删除**仅** `apps/game/.next` 并重新执行上述命令。

预览模式的边界：

- 仅在 `NODE_ENV=development` 且 `BOX_UI_PREVIEW=true` 时生效，生产 Compose、镜像和发行包不得设置该变量；
- 当游玩库为空时，首页会显示内置示例地图与在线人数，用于检查卡片、封面、空状态和窄屏布局；
- 点击“登录 / 注册”会模拟登录为测试玩家；点击“服主管理”会直接进入管理界面，便于检查账户、资源状态、地图开关和删除确认的视觉状态；
- 模拟登录不创建真实会话，也不替代 Player Service、服主密钥、导入、删除或其他服务端权限测试。涉及真实数据的行为必须在常规 Play 环境验证；
- 不要把预览模式专用文案、假数据或绕过校验的逻辑扩散到生产路径。新增预览分支时必须明确以 `uiPreview` 限制，并保持生产路径原有认证与授权检查。

UI 改动完成后至少检查：未登录/已登录/服主三种状态、空状态、加载或进度状态、错误状态、关闭地图不可见状态，以及窄屏布局。然后运行受影响页面的 Prettier、ESLint 和对应接口或服务端回归；确认后再决定是否需要重建镜像或启动器。

### 图形化启动器

仅调试界面：

```bash
pnpm --dir apps/deployment-manager dev
```

调试原生 Tauri 应用：

```bash
pnpm --filter @box-local/deployment-manager tauri dev
```

启动器后端在 `apps/deployment-manager/src-tauri/src/lib.rs`，前端在 `apps/deployment-manager/src/main.js`，样式在 `apps/deployment-manager/src/styles.css`。前端通过 Tauri `invoke` 调用后端命令；新增命令必须同时：

1. 定义明确的输入/输出结构；
2. 在 `tauri::generate_handler!` 注册；
3. 处理错误而不泄露密钥；
4. 增加 Rust 单测或 `scripts/check-desktop-deployment-manager.js` 回归；
5. 验证亮色、暗色、空状态、加载状态和错误状态。

`src-tauri/src/` 已按职责拆分：`config.rs` 负责应用数据目录、配置解析和原子写入；`docker.rs` 负责 Docker 命令；`models.rs` 维护前端可见的数据契约；`commands.rs` 负责 Tauri 命令、配置校验、备份和诊断；`lib.rs` 只组装模块和注册命令。新增功能优先进入对应模块，不要重新把业务逻辑堆回 `lib.rs` 或把前端数据结构散落到命令实现中。

### 地图脚本 API 与声明

- 客户端声明入口在 `packages/script-api/src/client/`，生成 `client-api-types.dts` 后由 Creator 的 Monaco 注入；常用浏览器类型也在这里维护。
- 服务端声明由 `packages/script-api/src/server/`、`apps/game/src/resource/api-declarations.dts` 和 schema 共同提供，运行实现位于 `services/game-server/src/script/`。
- DTS 是编辑器契约，不是运行时权限控制。客户端脚本在浏览器执行；禁止把密码、Cookie、Token、数据库连接、服主密钥或权威判定放入客户端。
- 删除公开脚本 API 时，必须同时清理 schema、声明、运行绑定、同步事件和生成产物，并更新 `scripts/platform-api-removal.test.js`。不要留下永远不触发的空事件来伪造兼容。
- URL 能力不使用平台域名白名单，但 `packages/utils/src/safe-url.ts` 与客户端/服务端调用点必须继续拒绝非 HTTP(S) 协议、控制字符和 URL 凭据。Origin/CORS/returnUrl 校验属于服务接口边界，不能随资源白名单一起删除。

修改脚本接口后至少运行：

```bash
pnpm --filter @box-local/script-api build
node scripts/platform-api-removal.test.js
pnpm --filter @box-local/game-server exec tsc --noEmit
```

## 5. 配置、数据与安全边界

### 配置文件

- `.env`：服主主动配置的地址、端口、容量、密钥与远程数据服务参数；
- `.runtime.env`：启动器在每次 Compose 操作前生成的 URL、CORS、镜像标签和 bind IP；不得要求服主手工维护；
- `.env.docker.example`：Docker/源码部署模板；
- `apps/deployment-manager/src-tauri/defaults.env`：图形化启动器创建初始配置的模板。

新增环境变量时必须同时检查：默认值、输入校验、启动器表单/原始 `.env`、Compose 传递、文档、`.env.example` 和安全性。不要把一个真实密码复制到多个派生变量；运行时拼接出的数据库 URL、CORS 和内部服务地址应留在 `.runtime.env`。

### 密钥与日志

- 不要在 Issue、PR、截图、测试 fixture、文档或 commit 中放真实 API Key、数据库密码、会话令牌或用户 IP。
- 使用最小权限、随机且可轮换的密钥；修复泄露后立即在服务端轮换，而不是只从 Git 历史删除。
- 新增日志必须避免输出授权头、连接串、Cookie、密码、完整 token 和个人数据。
- 导出的诊断包必须经过脱敏；任何新的敏感配置键都要加入脱敏规则。

### 网络边界

- Play、玩家服务和登录门户可按服主配置本机、局域网或公网访问；公网场景使用 HTTPS 反向代理、访问控制和防火墙。
- Creator 与 VOXA 不得暴露到公网。启动器、Compose 端口绑定和运行时 host 校验应形成多层限制，不能只依赖 UI。
- 外部 API 必须验证服主 API Key、输入范围、来源与权限，不能仅靠前端隐藏按钮。

## 6. 开发流程

### 开始任务

```bash
git status --short
git pull --ff-only
pnpm install --frozen-lockfile
```

阅读相关模块与现有测试后再改。涉及 boxes 兼容逻辑时，先记录“保持一致的行为”和“刻意不同的本地化行为”；不要凭感觉修改协议字段、资源格式或消息顺序。

### 实现与自检

建议按以下顺序工作：

1. 明确可观察的验收行为和失败提示；
2. 修改最小必要模块；
3. 为 bug 或接口变化增加回归；
4. 格式化受影响文件；
5. 运行模块级检查；
6. 运行全量门禁；
7. 更新用户文档、运维文档或发行说明。

禁止用“临时关闭检查”“捕获后忽略异常”“无限重试”掩盖问题。运行时锁、容器、网络和文件系统问题必须有超时、错误上下文与恢复路径。

## 7. 验证矩阵

提交前最低要求：

```bash
pnpm format:check
pnpm lint:control
pnpm check
```

`pnpm check` 保持完整回归顺序；需要定位问题时可运行它的分组命令，分组之间没有不同的通过标准：

| 命令                       | 覆盖范围                                               | 适用场景                                          |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `pnpm check:local-control` | 本地控制层、项目存储身份、Play 刷新与独立部署          | 改动 `apps/local-engine/`、Compose 或本地项目流程 |
| `pnpm check:engine`        | Game、VOXA、game-server、本地平台 API 与引擎消息顺序   | 改动引擎兼容层、模型或协议                        |
| `pnpm check:distribution`  | Windows 离线包、Tauri 启动器、Release 工作流与文档链接 | 改动启动器、镜像、CI、README 或 `docs/`           |
| `pnpm check:integration`   | 地图组锁、玩家门户、迁移器与 Teleport                  | 改动跨服务生命周期或迁移流程                      |

分组检查仅用于缩短本地反馈；提交前仍应运行完整 `pnpm check`，发行前运行 `pnpm verify`。

合并前和发行前必须执行：

```bash
pnpm verify
```

`pnpm verify` 包含格式、lint、可稳定执行的类型检查、本地控制层与 game-server 回归、项目/地图组、存储 namespace、Teleport、VOXA、迁移器、Windows 安装器和桌面启动器检查。

根据改动范围额外执行：

| 改动                        | 额外验证                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose / Dockerfile / 镜像 | `docker compose config --quiet`、目标服务 build、容器健康检查                                                                                   |
| 项目/发布/游玩包            | 创建、导入、保存、发布、导出、重新导入、Play 进入 smoke test                                                                                    |
| 地图组/Teleport             | 主副地图、私有房间隔离、跨组拒绝、空闲回收回归                                                                                                  |
| 存储/玩家/权限              | PostgreSQL 已配置与未配置、临时/永久封禁、强制下线、API Key 拒绝路径                                                                            |
| VOXA/模型                   | 本地模型库、项目内模型、皮肤、删除/重命名与发布后资源读取                                                                                       |
| 启动器                      | `cargo test --manifest-path apps/deployment-manager/src-tauri/Cargo.toml`、`pnpm --dir apps/deployment-manager run build`、macOS/Windows 包校验 |
| 迁移器                      | 真实小工程与失败资源、超时、取消、重试和错误展示                                                                                                |
| 云端迁移后的脚本文件树      | `pnpm --filter @box-local/game-server test`；确认普通迁移脚本在共享资源刷新后仍显示、已移除共享脚本会消失                                       |
| Play 页面 UI                | UI 预览模式的未登录/已登录/服主、空/加载/错误、关闭地图与窄屏状态；再用常规 Play 环境验证真实权限与数据操作                                     |

测试不得连接真实生产 PostgreSQL、Redis 或云端账号。所有临时目录、端口、项目 ID 和资源 hash 应隔离且可重复运行。

## 8. Git 协作与评审

建议分支命名：

```text
feature/<短说明>
fix/<问题>
docs/<主题>
release/<版本>
```

每个提交只聚焦一个可解释的变化。推荐提交说明：

```text
feat(launcher): add build details to about page
fix(play): reject incomplete published assets during import
docs(release): document unsigned desktop distribution
```

发起 PR 时应说明：

1. 问题、用户影响与解决方式；
2. 修改的模块边界和是否涉及 boxes 兼容接口；
3. 数据、配置、网络、权限和迁移影响；
4. 已执行的测试命令及结果；
5. UI 改动的亮色/暗色、空/加载/错误状态截图；
6. 未覆盖的风险、后续工作或需要发布负责人确认的事项。

评审者重点检查：是否误改了无关代码、是否保护了密钥、是否存在数据丢失路径、是否保持 Creator/Play 隔离、是否在失败时给出可操作的错误信息，以及测试是否覆盖了实际用户流程。

## 9. 文档维护

代码行为变化时同步更新对应文档：

| 主题                     | 文档                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| 架构、源码入口与模块职责 | [architecture.md](./architecture.md)                                 |
| 创作、工程、发布与地图组 | [projects.md](./projects.md)                                         |
| Play 部署与对外访问      | [play-deployment.md](./play-deployment.md)                           |
| 数据库与表命名空间       | [postgresql-data-storage.md](./postgresql-data-storage.md)           |
| 玩家服务与自建登录       | [player-service-api.md](./player-service-api.md)                     |
| 自建登录门户安全接入     | [self-hosted-login.md](./self-hosted-login.md)                       |
| 启动器使用               | [graphical-deployment-manager.md](./graphical-deployment-manager.md) |
| 离线包、Release 与 CI    | [release-and-distribution.md](./release-and-distribution.md)         |
| boxes 兼容边界           | [boxes-parity.md](./boxes-parity.md)                                 |
| 安全风险与依赖审计       | [security-audit.md](./security-audit.md)                             |

文档写明确命令、适用范围、前置条件、结果与恢复方式。不要在文档中承诺尚未实现的行为；例如未签名包应明确标注为未签名，Creator/VOXA 的公网限制不能描述为可选项。

## 10. 一份改动的最小交付标准

功能完成不等于“页面能打开”。交付前请在 PR/提交说明中留下以下可复核信息：

1. **行为**：用户此前遇到什么，修复后成功与失败分别会看到什么。
2. **边界**：是否改变工程/发布快照、共享资源、权限、网络、配置或 boxes 兼容接口。
3. **测试**：执行过哪些命令；如果无法运行，说明原因和替代验证。
4. **数据安全**：是否会修改、覆盖、迁移或删除用户数据；失败能否恢复。
5. **文档**：新增变量、端口、操作步骤、发行包或限制是否已经更新到 `docs/`。

对于迁移、导入和资源问题，测试 fixture 必须至少同时包含入口脚本、一个普通地图脚本和一个共享脚本；只测试“能启动”不足以证明编辑器文件树与地图实际运行内容一致。

## 11. 构建与发行

桌面启动器、离线镜像、SHA-256、未签名/签名发布、GitHub Tag 工作流的完整说明见[桌面启动器打包、分发与 CI 发布手册](./release-and-distribution.md)。

发布负责人至少应确认：

- 工作区干净、Tag 指向已评审提交；
- `pnpm verify` 通过；
- 各目标架构在干净电脑上完成 Docker 导入和启动 smoke test；
- 离线包不含 `.env`、用户数据、日志、数据库、备份或真实密钥；
- Creator/VOXA 未被公网暴露；
- 未签名发行包在 Release 说明中明确告知 Windows SmartScreen/macOS Gatekeeper 的首次打开行为；
- 有签名凭据时，再启用 Windows Authenticode 和 macOS Developer ID/notarization。

## 12. 深入阅读

- [工程开发规范](./engineering.md)：工程门禁、兼容策略、技术债与安全审计重点。
- [安装、部署与使用手册](./installation-and-operations.md)：服主运维与恢复流程。
- [图形化部署管理器](./graphical-deployment-manager.md)：启动器功能与配置语义。
- [桌面启动器打包、分发与 CI 发布手册](./release-and-distribution.md)：离线包与 Release 交付。

当本文与实现发生冲突时，先修正文档或代码，不要长期保留模糊规则。

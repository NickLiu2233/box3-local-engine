# BOX3 Local Engine 贡献指南

欢迎一起完善 BOX3 Local Engine。修复问题、补充测试、改进界面和文档都可以参与。这份指南带你从运行源码开始，完成修改后再检查和提交。

项目代码采用 MIT 开源许可，允许按协议修改、商用和再分发；品牌和商标使用另行处理。贡献代码前请确认你有权提交，并保留原作者与第三方许可声明。

当前源码版本为 `0.3.0`，官方仓库 [ifishcool/box-local-engine](https://github.com/ifishcool/box-local-engine)已公开。任何人都可以 Fork 并贡献代码，不需要仓库邀请。

## 1. 开始前

第一次接手某个改动时，先找对应模块和测试；目标较大或涉及数据、协议时，先开 Issue 与维护者讨论范围。

开始工作前先确认工作区状态，不要覆盖其他协作者的改动：

```bash
git status --short
git remote -v
```

禁止提交真实密钥、用户数据、数据库备份、地图工程、VOXA 数据、Docker 卷和日志。不要手工修改 `.next*`、`dist/`、`build/`、`target/` 或其他生成物，除非该生成物明确属于仓库发布契约。

## 2. 获取源码、同步与分支

先在 GitHub Fork 公开仓库到自己的账号，再克隆自己的 Fork。`origin` 指向自己的 Fork，`upstream` 指向官方仓库：

```bash
git clone https://github.com/<your-account>/box-local-engine.git
cd box-local-engine
git remote add upstream https://github.com/ifishcool/box-local-engine.git
git fetch upstream
git switch main
git merge --ff-only upstream/main
git switch -c codex/<short-description>
```

将 `<your-account>` 替换为自己的 GitHub 用户名。主题分支推送到自己的 `origin`，Pull Request 的目标选择官方仓库的 `main`；Fork 贡献不要求官方仓库写入权限。
不要覆盖其他人的未提交改动，不要向多人共用的分支强制推送。

## 3. 环境要求

- Node.js `22.17.x`，仓库通过 `.node-version` 固定版本；
- Rush `5.156.0`，由仓库启动脚本自动准备；
- pnpm `10.12.1`，仅由 Rush 内部管理，无需全局安装；
- Docker Engine 或 Docker Desktop，支持 Docker Compose v2；
- Rust stable，用于管理器测试和桌面 App 构建；
- 目标平台原生构建工具。桌面公开包必须在对应操作系统和 CPU 架构上生成。

安装依赖：

```bash
npm run install:all
cp .env.docker.example .env
```

根 npm 命令会自动准备仓库锁定版本的 Rush，不要求全局安装。已有 Rush `5.156.0` 时，可用 `rush install` 代替 `npm run install:all`。如需直接使用本文的 `rush` 和 `rushx` 命令，可选执行 `npm install --global @microsoft/rush@5.156.0`；否则使用下表 npm 别名或 `npm run rush -- <命令>`。

`.env` 只保存在本机。源码开发至少需要 PostgreSQL；Redis 可选。使用外部服务时设置：

```env
BOX_DATABASE_URL=postgresql://USER:CHANGE_ME_DATABASE_PASSWORD@127.0.0.1:5432/DATABASE
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

Rush 是仓库唯一的 Monorepo 入口。`rush.json` 是项目清单，`common/config/rush/pnpm-lock.yaml` 是主工程提交的 Rush 依赖锁文件；不要重新创建根目录的 `pnpm-workspace.yaml` 或 `pnpm-lock.yaml`。登录门户独立模板的 `package-lock.json` 用于独立构建，不替代 Rush 锁文件。

拉取没有依赖变化的提交后运行 `rush install`。修改任意项目的 `package.json`、新增项目或调整依赖后运行 `rush update`，并提交更新后的 Rush 锁文件。新增项目还必须加入 `rush.json`。在单个项目目录执行该项目脚本时使用 `rushx <script>`；跨项目构建使用 `rush build --to <package-name>`，修改公共包后可用 `rush build --from <package-name>` 构建所有受影响项目。

根 `package.json` 提供等价的 npm 入口，便于不知道 Rush 命令的新贡献者查找：

| 任务                 | Rush 命令              | npm 别名                  |
| -------------------- | ---------------------- | ------------------------- |
| 安装锁定依赖         | `rush install`         | `npm run install:all`     |
| 更新依赖锁           | `rush update`          | `npm run update:all`      |
| 启动完整开发栈       | `rush dev`             | `npm run dev`             |
| 启动开发栈及基础服务 | `rush dev --infra`     | `npm run dev:infra`       |
| 检查项目登记         | `rush workspace-check` | `npm run check:workspace` |
| 独立查看 API 文档    | `rush api-docs`        | `npm run api:docs`        |
| 全量构建             | `rush build`           | `npm run build`           |
| 格式化               | `rush format`          | `npm run format`          |
| 完整验证             | `rush verify`          | `npm run verify`          |

npm 别名的额外参数必须放在 `--` 后，例如：

```bash
npm run build -- --to @box/player-admin
npm run package:images -- --architecture arm64 --service player-service
```

## 4. 启动源码开发环境

```bash
npm run dev
```

该命令直接运行源码，不使用业务镜像：

| 服务               | 默认地址                 |
| ------------------ | ------------------------ |
| Creator            | `http://127.0.0.1:3127/` |
| Play               | `http://127.0.0.1:3121/` |
| VOXA               | `http://127.0.0.1:3123/` |
| Player Service API | `http://127.0.0.1:3124/` |
| 参考登录门户       | `http://127.0.0.1:3125/` |
| 玩家后台           | `http://127.0.0.1:8000/` |

`rush dev` 默认使用 `.env` 中已有的 PostgreSQL/Redis，不会启动或停止 Docker 基础服务。需要本机开发数据库时执行（等价于 `rush dev --infra`）：

```bash
npm run dev:infra
```

只开发 Creator 相关功能时可以执行：

```bash
npm run dev:creator
```

玩家管理前端默认由 `rush dev` 启动。已有 Player Service、只开发后台时，使用 `npm run dev:admin`，或在项目目录执行：

```bash
cd apps/player-admin
npm run dev
```

访问 `http://127.0.0.1:8000/`。Umi 会把 `/api` 代理到 `3124`；生产发行版则把构建结果挂载在 Player Service 根路径，不需要独立前端进程。

`rush dev --no-admin` 可关闭默认后台前端；`rush dev-player-launcher` 启动原生玩家启动器，`rush dev-manager` 预览部署管理器。项目登记、独立入口和打包/部署命令见[Rush 工作区指南](docs/rush-workspace.md)。

Creator、Play 和 Player Service 使用独立的 `.next-*` 与临时 tsconfig。前端页面通常支持热更新；`apps/local-engine/src/`、`services/game-server/src/` 和公共包构建产物变化后通常需要重启开发栈。

## 5. 代码边界

自有代码、工具、测试与文档示例统一遵循[代码风格](docs/code-style.md)，不在各项目维护另一套约定。修改后执行 `npm run format:owned:check`，格式化使用 `npm run format:owned`；上游同步代码、生成结果与语言例外按该指南处理。

| 领域                                     | 主要目录                    |
| ---------------------------------------- | --------------------------- |
| Creator、Play、Player Service 与引擎前端 | `apps/game/`                |
| 玩家管理后台                             | `apps/player-admin/`        |
| 工程、地图组、发布与运行时生命周期       | `apps/local-engine/src/`    |
| 权威游戏服务器和脚本运行时               | `services/game-server/src/` |
| VOXA 模型编辑                            | `apps/voxa/`                |
| 桌面启动器                               | `apps/deployment-manager/`  |
| 桌面/Web 共用管理核心                    | `apps/manager-core/`        |
| Linux Web 管理端                         | `apps/server-manager-rust/` |
| 玩家登录与注册门户                       | `apps/player-auth-portal/`  |

Creator 编辑可变 `.boxproject`，Play 只运行 `.boxplay` 快照。地图 ID、地图组、Blob/hash、脚本 API、发布清单、MuDB 和运行时协议属于兼容接口；修改前阅读[领域模型](docs/domain-model.md)、[系统架构](docs/architecture.md)与[对齐基线](docs/boxes-parity.md)。

玩家管理菜单与 API 必须使用同一套 capability。新增页面或写操作时同步修改前端可见性、服务端授权、权限组分类、API 文档和拒绝测试，不能只隐藏按钮。

所有对外 Local Engine HTTP 接口统一登记在 `@box/apis` 的 OpenAPI 契约中。新增或修改接口时按 [Local Engine API 与 Swagger](docs/local-engine-api.md) 更新 schema、生成类型和调用端；禁止在应用内新增平行 API 客户端，禁止重新引入旧平台生成接口。内部迁移器是明确例外，不进入统一契约和普通发行包。

### 写代码时的约定

- 先复用已有模块、组件和接口，再考虑新增实现；修复问题时不要顺带重写无关功能。
- 手写代码文件尽量少于 500 行。按业务职责拆分，不按行数切成大量小文件；生成代码和第三方源码不为满足行数而手改。
- 类适合管理状态和生命周期，纯转换逻辑可以用函数。不要只把整段流程包进一个大方法。
- 注释说明为什么这样做、兼容哪些行为和哪里不能信任客户端；不逐行复述代码。
- 管理后台优先复用已有布局、表单和权限组件，保持其他页面的交互习惯。
- 地图玩法由图主决定，反作弊接口提供服务端数据和处理能力，不随意增加写死的速度、距离或玩法限制。客户端提交的数据仍须校验身份、所有权和结构。

## 6. 测试

暂存准备提交的文件后，运行 `node scripts/check-public-repository.js --staged`；公开仓库不得跟踪内部工具、真实环境密钥或用户数据。检查范围及新仓库发布注意事项见[公开仓库检查记录](docs/public-repository-audit.md)。

提交前应运行完整验证；存在失败时如实记录，不能把局部通过写成全量通过：

```bash
rush verify
```

它依次执行格式检查、Lint、类型检查、Node 回归、发行包检查、文档检查以及 Rust 测试。快速开发时可先运行与改动最相关的命令：

```bash
rush format-check
rush lint
rush typecheck
rushx test # 在 apps/local-engine 或 services/game-server 中执行
rush build --to @box/voxa
rush build --to @box/player-admin
```

涉及 Compose、Dockerfile、安装器、权限、数据库 schema、地图组、地图 ID、`.boxproject`/`.boxplay`、脚本 API 或管理器时，不能只运行局部测试，必须执行完整 `rush verify`。

权限和脚本接口既要测正常调用，也要测未授权、撤销授权和伪造客户端请求。反作弊修改还需检查拒绝消息后是否误改状态，以及允许的正常玩法是否仍能运行。不能用客户端隐藏按钮或 DTS 提示代替服务端验证。

仅改文档时至少运行 `node scripts/check-documentation.js` 和 `git diff --check`。完整验证的已知失败见[版本说明](docs/current-status.md)；交付时写清哪些检查通过、哪些未运行或失败。

## 7. 文档要求

专题职责、当前指南/历史验收/规划分类及检查清单见[文档维护](docs/documentation-maintenance.md)。

以下变化必须在同一提交更新根 README、相关 `docs/` 专题、配置示例和回归测试：

- 服务、端口、镜像、安装方式、发行附件或支持平台；
- 环境变量、默认值、管理器表单和 Compose 传递；
- 地图组、发布包、玩家身份、权限、Cookie 或 API；
- 用户可见按钮、菜单、错误信息和删除的功能。

文档只描述已经实现的行为。设计草案必须明确标注“设计”或“历史”，不能混入用户操作步骤。命令应从当前 `package.json`、脚本帮助和工作流核对，不能凭旧版本复制。

## 8. 构建镜像和发行包

源码开发和镜像部署是两套运行方式。源码改动不会自动进入已有容器，打包后需要重新创建相关容器才能验证。

```bash
# 构建完整 Linux ARM64 镜像归档
npm run package:images:arm64
# 构建 Apple Silicon macOS 桌面包
npm run package:desktop:macos-arm64
# 构建 Linux ARM64 无桌面服务器包
npm run package:web:arm64
```

产物位于 `apps/local-engine/dist/`。目标架构、复用已有镜像归档、离线包内容和签名要求见[构建与分发](docs/release-and-distribution.md)。构建示例不代表产物已经通过目标平台验收；不要把本机归档或安装包提交到 Git。

## 9. 提交与 Pull Request

提交应小而完整，代码、测试、配置与文档一起更新。提交前检查：

```bash
git status --short
git diff --check
rush verify
```

只暂存本次工作的文件，确认暂存内容后再提交：

```bash
git add <files>
git diff --cached
git commit -m "feat: describe the change"
git push -u origin codex/<short-description>
```

评审期间需要同步主分支时，先确保工作区干净。在自己的主题分支合并上游更新，再重新验证：

```bash
git fetch upstream
git merge upstream/main
npm run install:all
npm run verify
git push
```

如果团队要求线性历史，可与维护者约定后在自己独占的主题分支上 rebase；不要改写多人共用的分支。只暂存本次工作的文件，不要用 `git add .` 混入环境文件、日志、地图或其他人的改动。

Pull Request 至少说明：

1. 问题和目标；
2. 修改范围及受影响服务；
3. 数据、协议、权限和兼容性变化；
4. 已运行的验证命令和结果；
5. UI 改动截图或录屏；
6. 发行改动的目标平台、架构和构建来源；
7. 风险与回滚方式。

评审重点包括服务端授权、秘密泄露、数据可恢复性、跨平台行为、离线包可复现性和文档准确性。

## 10. 常见开发问题

- **依赖锁不一致：**普通拉取后执行 `rush install`；自己修改依赖后执行 `rush update`。不要绕过 Rush 直接调用 pnpm 的依赖安装命令。
- **端口冲突：**检查 3121、3123、3124、3125、3127、8000、9966、9967 和 9971；使用 `--infra` 时还需检查 5432 和 6379。
- **玩家管理提示服务不可用：**先检查 Player Service 日志和 PostgreSQL。后台前端端口是 8000，API 仍依赖 3124；没有外部数据库时用 `rush dev --infra`。该模式会使用开发 PostgreSQL 参数，避免桌面部署写入 `.env` 的容器数据库 URL 被源码进程误用。
- **源码已改但容器未更新：**开发服务和业务镜像互不自动同步。重新构建镜像并重新创建容器，重启旧容器不会获取新代码。
- **运行时没有热更新：**`apps/local-engine`、`services/game-server` 和公共包变化后通常需要重启 `rush dev`。
- **Rush 报告已有任务：**等待正在运行的安装、验证或打包任务完成，不要删除 Rush 锁或强行并发。
- **格式检查失败：**运行 `rush format`，检查格式化 diff 后再执行 `rush format-check`。

完整排障、局部构建、镜像部署验证和模块说明见[开发者与协作手册](docs/developer-guide.md)。

## 11. 发布纪律

公开源码与官方发行权限分开管理。Fork 的贡献者通过 Pull Request 提交改动，官方 Tag、GitHub Release 和 OSS/CDN 发布由维护者执行；不要在 Fork 中配置或索取官方发布密钥。公开源码不代表所有历史安装包已同步更新。

主分支和 Pull Request 的 Verify 工作流执行生产依赖审计、Compose 校验和 `rush verify`。Tag Release 工作流负责版本/OSS 配置校验、镜像与安装包构建、GitHub Release 及 OSS/CDN 发布；它不会再次执行完整 Verify，因此创建 Tag 前必须确认对应提交的 Verify 已通过。

Release Tag 必须严格等于根 `package.json` 的 `v<version>`。当前版本应使用 `v0.3.0`。不要移动或重复使用已发布 Tag；流水线会按 `box-local-engine/<tag>/` 复用同版本 OSS 中间产物。

公开发布前还应在干净机器验证镜像导入、无需激活的服务启动、数据库初始化、登录、地图导入、Creator/Play/VOXA、容器重启、升级保留数据和 SHA-256 校验。Windows 使用 Authenticode；macOS 使用 Developer ID 签名和公证。

## 12. 安全边界

- 不把密钥、权限判定和权威存档放进浏览器或客户端地图脚本；
- 不把 Docker Socket、PostgreSQL、Redis 或管理端裸露到不受信任公网；
- 不在日志、截图、Issue 或 PR 中粘贴 Cookie、Token、数据库 URL 和用户数据；
- 不用删除卷、清空数据库或删除地图目录作为常规排障手段；
- 高风险删除、封禁、Token 撤销和容器操作必须保留确认、授权与审计。

源码与发行包中的项目代码采用 [MIT License](LICENSE.md)。分发时保留版权与许可声明，第三方代码继续遵守原许可；品牌合作与商标使用不由 MIT 授权。详细边界见[开源许可说明](docs/open-source-licensing.md)。

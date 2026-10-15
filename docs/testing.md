# 测试指南

本文所有命令均从仓库根目录执行。先使用 Node.js `22.17.x` 运行 `npm run install:all`；完整验证还需要 Rust stable、编译工具链和可访问的 Python 3。测试退出码 `0` 表示该命令成功，不能据此推断没有执行的集成或平台检查也通过。

## 根验证与默认 CI

```sh
npm run verify
git diff --check
```

`verify` 由 `scripts/repo-tasks.js` 调度，依次运行格式、Lint、类型与测试；遇到首个失败会停止。`npm run test` 包含模块测试与 `npm run check` 的工程检查。普通 PR 的 Verify 工作流运行同一根验证，另有生产依赖审计和 Compose 模板检查；PR 不上传官方发行包。

联网依赖审计使用 `node scripts/audit-dependencies.js`，拒绝生产依赖中的全部 high 与 critical，不需要例外配置文件。仅用于编译、开发和代码检查的工具应放在 `devDependencies`。审计成功不等于零漏洞，也不覆盖开发工具链的风险。网络审计由 CI 独立运行，本地根验证只测试安全门槛逻辑，不要求 registry 在线。依赖升级后应重新运行联网审计。

| 层次       | 默认验证中的内容                                                                                               | 仍需额外验证的内容                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| JS/TS      | game Jest、local-engine 与 game-server 回归、反作弊、VOXA 指定回归、登录门户、公共包/API、工作区与发行结构检查 | 全部应用的完整类型覆盖、真实业务栈、所有未加入调度的专用脚本 |
| 玩家启动器 | `check`：类型、Vite 构建、Node/tsx 测试、Electron 主进程打包                                                   | 真正启动 Electron、菜单/缓存 smoke、安装签名与更新           |
| Rust       | manager-core 测试，server-manager-rust 实际二进制编译检查与测试                                                | Tauri 原生 App 编译、桌面交互、目标 OS 安装验收              |
| 数据与部署 | 临时文件、内存/模拟数据库、部署契约与配置检查                                                                  | 真实 PostgreSQL、Redis、Docker 镜像启动、多人运行和备份恢复  |

Jest 的 PostgreSQL 条件测试在未设置 `MODERATION_TEST_DATABASE_URL` 时会显示 skipped。看到 skipped 需要记录；默认 PR 没有这个变量时，不能声称完成数据库授权持久化回归。根类型检查也不是对所有 TS 项目执行一遍 `tsc`；准确范围以调度与各项目脚本为准。

Rush 会读取仓库及用户配置中的环境设置。game 的 Jest 在业务模块导入前清除继承的 `BOX_*` 部署变量和内部传输密钥，避免开发数据库、服务器名称和代理配置影响自动测试；测试自行设置需要的夹具。此隔离只发生在测试进程，保留明确的 `MODERATION_TEST_DATABASE_URL`，不改写本机 `.env`。真实数据库回归必须使用下面的专用测试库入口。

开发中可分别运行 `npm run format:check`、`npm run lint`、`npm run typecheck`、`npm run test` 和 `npm run check` 定位失败。根任务会先准备所需公共包，再运行 local-engine 的 `prepare-assets`，生成 API、纹理和模型等运行资源后检查资源闭包。`apps/local-engine/data/blobs/` 整个目录纳入源码与 Docker 构建输入，最终镜像按运行引用复制资源，因此源码目录与镜像内的资源数量可以不同。直接执行局部测试若提示找不到 `dist` 或运行资源，先运行根 `npm run typecheck`，或按 Rush 依赖顺序构建项目并运行 `npm --prefix apps/local-engine run prepare-assets`。

`npm run check:public` 检查当前源码中的秘密与私密数据。当前文件扫描不清理 Git 历史或已经下载的副本。

历史检查独立于普通开发验证。`npm run check:history` 扫描当前 Git 仓库；准备公开时，在隔离的候选副本执行 `node scripts/check-public-history.js /absolute/path/to/public-candidate.git`。它扫描全部可达的正常分支、标签和远端跟踪引用，保留同一 blob 的历史路径判断，拒绝内部快照引用和直接指向 tree/blob 的引用；不能通过删除计划公开的引用来掩盖脏历史。二进制和超过 8 MiB 的 blob 不做内容扫描。历史检查通过不代表候选已经发布。

## 按模块运行

| 改动范围                     | 命令                                                                                                                                | 运行器与预期结果                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 工程、地图组、快照、导入导出 | `npm --prefix apps/local-engine test`                                                                                               | Node 脚本式回归；各项输出成功，退出 0                  |
| 网页服务、编辑器和会话       | `npm --prefix apps/game test -- --runInBand`                                                                                        | Jest；套件全部通过，检查 skipped 数量                  |
| 实时票据、协议、WebSocket    | `npm --prefix apps/game run test:realtime`                                                                                          | 构建/测试 realtime-client 后运行指定 Jest 套件         |
| 本地运行时会话               | `npm --prefix apps/game run test:local-runtime-session`                                                                             | ts-node 脚本式回归                                     |
| 权威运行时、资源与脚本       | `npm --prefix services/game-server test`                                                                                            | SWC 注册的 TS 回归与 Node 脚本                         |
| 反作弊                       | `npm --prefix services/game-server run check:anticheat`                                                                             | SWC 回归、隔离环境回归与 Node test                     |
| 玩家启动器                   | `npm --prefix apps/player-launcher run check`                                                                                       | TypeScript、Vite、tsx/Node test 与 esbuild             |
| 部署管理界面                 | `npm --prefix apps/deployment-manager run check`、`npm --prefix apps/deployment-manager test`                                       | 结构/API 构建/Vite 与 Node test                        |
| 玩家后台                     | `npm --prefix apps/player-admin run typecheck`                                                                                      | TypeScript；权限与服务端行为还需 game/策略测试         |
| 登录门户                     | `npm --prefix apps/player-auth-portal run check`                                                                                    | 模块脚本中的类型、构建与回归                           |
| HTTP 契约和客户端            | `npm run api:check`、`npm --prefix internals/apis test`                                                                             | 生成同步检查与 Node test                               |
| Rust 共享核心                | `cargo test --manifest-path apps/manager-core/Cargo.toml`                                                                           | Cargo 测试，临时备份/配置等行为断言                    |
| Rust Web 管理器              | `cargo check --manifest-path apps/server-manager-rust/Cargo.toml`、`cargo test --manifest-path apps/server-manager-rust/Cargo.toml` | 编译实际适配器并运行 Cargo 测试                        |
| 文档                         | `node scripts/check-documentation.js`                                                                                               | 本地链接、导航、基础命令检查；不执行示例或检查远程链接 |

不要把 Jest 测试直接交给 `node --test`，也不要用 Jest 扫描 Node test 文件。`package.json` 中的脚本选择了所需注册器和运行器。game Jest 默认输出终端报告；如需 HTML 报告，在 POSIX shell 中使用 `JEST_HTML_REPORT=1 npm --prefix apps/game test -- --runInBand`，报告路径以日志为准，不自动打开浏览器。PowerShell 先设置 `$env:JEST_HTML_REPORT='1'`，执行后用 `Remove-Item Env:JEST_HTML_REPORT` 清除。

VOXA 的默认工程检查仅执行模型库范围、模型工程包、本地 CORS 和模型管理权限四项；另有 `check:default-skin-scope`、`check:parent-storage-url` 可按修改范围追加。不要把根验证中的选定脚本称为 VOXA 全量测试。

## 修改行为时选择回归

| 修改什么                                     | 至少增加的验证                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 玩家/管理员权限、封禁、地图授权              | game Jest、player-policy、玩家后台类型检查、真实 PostgreSQL 授权回归；实际检查普通玩家不能进入管理入口 |
| `.boxproject` / `.boxplay`、地图组或资源哈希 | local-engine 和 game-server 回归，首个作品教程的导出→重新导入→Play 流程，旧格式代表样本                |
| 实时连接、撤销会话、跨地图传送               | `test:realtime`、game-server `check:realtime`、真实数据库 change feed、两名玩家连接与强制下线          |
| 地图脚本、隔离环境、移动校验                 | game-server 测试与 `check:anticheat`，实际预览和 Play；脚本类型修改追加 game `build:script-types`      |
| VOXA 模型保存、工程导入和跨地图共享          | 相应 VOXA 回归、local-engine 发布资源回归、模型保存与地图放置验收                                      |
| Docker、备份、发行与管理命令                 | 根 `check`、对应 Rust 测试、实际目标平台镜像/管理器启动与恢复验收                                      |
| 玩家启动器导航、URL、缓存或权限              | 启动器 `check`、受影响 Electron smoke、真实服务器连接                                                  |

纯文案或局部文档改动可缩小到文档、格式和差异检查，并在 PR 说明执行范围；行为变化需要验证失败路径，不能只验证正常请求。

## 真实 PostgreSQL 专项

准备一个专用测试库与账号，允许创建和删除 schema。不要连接线上数据。下面 `<...>` 是占位值；密码中特殊字符应 URL 编码。测试命令不自动读取根 `.env`。

在 POSIX shell 中执行地图授权持久化回归：

```sh
MODERATION_TEST_DATABASE_URL='postgresql://<test-user>:<test-password>@127.0.0.1:5432/<test-database>' \
  npm --prefix apps/game test -- --runInBand --runTestsByPath server/script-moderation-store.test.ts
```

这项测试创建 `moderation_test_*` schema 和临时工程目录，在 `finally` 中删除并关闭测试拥有的连接池；覆盖未注册任何玩家时的首次服主身份表初始化、授权更新、永久封禁、撤销与旧授权迁移。连接错误或权限不足应失败，不能用 unset 变量后的 skipped 代替通过。

实时 change feed 使用另一个明确的入口：

```sh
BOX_DATABASE_URL='postgresql://<test-user>:<test-password>@127.0.0.1:5432/<test-database>' \
  npm --prefix apps/game run test:realtime-postgres
```

它创建唯一 `ws_regression_*` schema，检查并发撤销事件、事务和监听重连，最后删除 schema。重连测试会终止自己的监听连接，需要数据库账号具备相应权限。PowerShell 用 `$env:MODERATION_TEST_DATABASE_URL` 或 `$env:BOX_DATABASE_URL` 设置变量，运行对应 npm 命令后清除变量。

`services/game-server` 的 `check:postgres-storage` 使用 `pg-mem`；`check:redis-runtime` 使用内存 Redis 适配器。名称中包含 PostgreSQL/Redis 不表示连接了真实服务。真实数据库和缓存的网络错误、TLS、池配置、重启与故障回退需要在独立开发部署中检查。

## 图形、Docker 与业务验收

玩家启动器的图形 smoke 需可运行 Electron 的桌面会话：

```sh
npm --prefix apps/player-launcher run test:desktop
npm --prefix apps/player-launcher run test:menu
npm --prefix apps/player-launcher run test:cache
```

Linux 无桌面 CI 需要相应系统库和可用显示服务；默认 `check` 不启动 Electron。Tauri 原生开发用 `npm run dev:manager:native`，工具链见[部署管理器说明](../apps/deployment-manager/README.md)。跨平台包需要在目标 OS 和架构实际打开，检查 Docker 连接、文件选择、备份、更新、主题和窄窗口。

Docker smoke 应从非生产数据目录启动候选镜像，检查服务健康、登录、创建/预览/发布、后台导入、两名玩家连接、重启与数据保留。按[首个作品教程](./first-project.md)验收源码，再按[Linux 服务器包](../distribution/server/README.md)或桌面安装流程验收发行产物；源码通过不能证明镜像中装入了相同代码和资源。

## 测试数据与结果记录

自动回归普遍使用临时目录、专用 schema 或测试适配器。失败后先看测试创建路径和清理代码；发生强制中断时只清理本次测试产生的目录/schema，不删除开发数据库或 Docker 持久卷。启动器检查会生成 `dist/` 与 `dist-electron/`，Jest HTML 是可选生成物；运行后用 `git status --short` 检查意外的跟踪文件变化，不把报告、项目和运行数据提交。

PR 应记录实际命令、退出结果、失败与 skipped 原因，以及真实数据库、目标平台、镜像版本/提交等证据。测试日志和截图先移除 Token、Cookie、数据库凭据与玩家资料。一个通过的结构断言不能代替真实协议、持久化或用户操作验收。

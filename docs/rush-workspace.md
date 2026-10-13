# Rush 工作区与统一入口

更新日期：2026-10-13。`rush.json` 当前登记 34 个主 npm 项目：8 个应用、5 个内部包、19 个公共包、1 个游戏服务和1 个工具项目。

## 检查与安装

```sh
npm run check:workspace
npm run install:all
```

等价于 `rush workspace-check` 和 `rush install`。检查器核对项目名称、重复目录、漏登记项目、内部 `workspace:` 链接及依赖循环。新增主项目时更新 `rush.json`，依赖变化后运行 `rush update`；只调整脚本不需要重新生成依赖锁。

嵌套的 5 个 `ao-mesher/modules` 第三方模块，以及各包 example、`mudb/tool/mudo` 等 7 个示例/工具清单，不是主 Rush 产品，不能因存在 package.json 就全部登记。它们由所属包或原示例维护，不并入主项目清单。

公共包新增 `@box/player-policy`、`@box/realtime-client` 和 `@box/deployment-routing`；原路径适配器已从 internals 提取为正式 Rush 包。入口和复用说明见[可复用包](./reusable-packages.md)。Rust 的 manager-core、Tauri 和 Web 管理端仍由现有应用、构建和验证流程调用 Cargo，不创建空 npm 包。内部迁移器不进入公共工作区。

旧 `box-api-client` / `box-api-types` 已被统一 `@box/apis` 替代，无引用的占位 README 已移除；本地剩余 dist/node_modules 缓存不是源码项目，不重新登记到 Rush。

## 源码开发

`npm run dev:infra` 等价于 `rush dev --infra`：先按依赖顺序编译共享库，再启动开发 PostgreSQL/Redis、Player Service、Creator、Play、VOXA、真实联调登录门户和玩家后台，不执行完整生产前端构建。门户使用 TypeScript watcher，不再引用旧 server.js 或模板模拟账号服务。

已有数据库用 `rush dev`，创作相关服务用 `rush dev-creator --infra`。两者默认包含 8000 端口后台，传 `--no-admin` 可关闭该前端。退出不会删除数据库卷。

| 单独开发       | Rush 命令                  | npm 别名                      |
| -------------- | -------------------------- | ----------------------------- |
| 玩家后台       | `rush dev-admin`           | `npm run dev:admin`           |
| 部署管理器前端 | `rush dev-manager`         | `npm run dev:manager`         |
| 原生玩家启动器 | `rush dev-player-launcher` | `npm run dev:player-launcher` |

独立入口先准备对应编译依赖。后台仍需要 Player Service 与数据库；管理器前端预览不代替 Tauri；玩家启动器复用原有 Electron 入口，由主进程启动 Vite。

完整原生部署管理器使用 `rush dev-manager --native`（`npm run dev:manager:native`），复用现有 Tauri dev 命令及前端钩子，需要 Rust 和平台原生工具链。

部分上游构建脚本使用 POSIX shell 命令，Windows 开发需要可用的 Git Bash/npm script shell 及原生工具链。本轮未验证全部 Windows 构建，不将当前平台通过视为全平台验收。

## API 与构建

| 任务           | Rush 命令                                           | npm 别名                                      |
| -------------- | --------------------------------------------------- | --------------------------------------------- |
| 生成 API       | `rush api-generate`                                 | `npm run api:generate`                        |
| 检查 API       | `rush api-check`                                    | `npm run api:check`                           |
| 构建 API       | `rush api-build`                                    | `npm run api:build`                           |
| 独立 Swagger   | `rush api-docs`                                     | `npm run api:docs`                            |
| 应用与上游构建 | `rush build --to @box/player-admin`                 | `npm run build -- --to @box/player-admin`     |
| 构建镜像       | `rush package-images --architecture arm64`          | `npm run package:images:arm64`                |
| 引擎桌面包     | `rush package-desktop --target macos-arm64`         | `npm run package:desktop:macos-arm64`         |
| Linux 服务器包 | `rush package-web --architecture arm64`             | `npm run package:web:arm64`                   |
| 玩家启动器包   | `rush package-player-launcher --target macos-arm64` | `npm run package:player-launcher:macos-arm64` |

玩家启动器未指定 target 时沿用当前平台默认值；引擎桌面包必须指定 target。发布仍遵循[引擎发行](./release-and-distribution.md)与[玩家独立发布](../apps/player-launcher/docs/release.md)，本地打包不代替最终验收。

## 部署与预览

```sh
rush deploy-service --service player-service
rush deploy-service --service play
```

等价 npm 命令为 `npm run deploy -- --service play`，复用现有 `*-up` 流程，不构建镜像、不自动填写生产密码或放宽来源校验。先配置 `.env`、准备镜像和数据库，Player Service 健康后再启动需要它的服务。支持 creator、play、voxa、player-service、player-auth-portal。完整运维优先使用[部署管理器](./graphical-deployment-manager.md)或[Linux 管理端](./linux-web-manager.md)。

`deploy-service` 不覆盖 Rush 内置 deploy 命令。新项目命令支持 `--dry-run`，只显示脚本、参数与依赖计划，不启动服务或构建安装包：

```sh
rush dev-admin --dry-run
rush package-player-launcher --target windows-arm64 --dry-run
rush deploy-service --service play --dry-run
```

计划通过不代表运行环境已验收。Rush 全局命令持有仓库锁，不并行运行多个全局任务；已有长驻开发栈时，在项目目录使用 `rushx`/npm 脚本，或先退出当前任务。完整验证仍为 `rush verify`。

## 本轮验证

以下为公共包提取前的工作区统一记录；提取后的 34 项目及独立包验证见[可复用包](./reusable-packages.md)。

Rush 实际列出 31 个项目，`rush workspace-check`、`rush install --check-only` 和通过 Rush 执行的 API 契约检查通过。18 个开发依赖包已在当前平台实际构建成功；后台、原生玩家启动器、Windows ARM64 玩家安装包和 Play 部署计划通过真实 Rush 的 `--dry-run` 检查。源码启动测试验证依赖先于服务准备、门户使用真实 TS 入口、后台默认启动及 `--no-admin` 行为。

220 项工程脚本回归、84 份文档检查、格式与 Lint 检查通过；原生 Tauri 管理器计划同样通过 `--native --dry-run` 验证。

没有启动、重启或重新配置运行中的 Docker 服务，也未生成安装包或运行完整源码开发栈。构建产生的无关上游产物差异已清理。旧的后台类型诊断及 Rust 格式问题仍见[当前状态](./current-status.md)，不因入口统一而计为通过。
